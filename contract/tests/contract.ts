import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("blockral", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Blockral as Program;
  const creator = provider.wallet;

  function nameToBytes(name: string): number[] {
    const bytes = new Array(32).fill(0);
    const encoded = Buffer.from(name, "utf-8");
    for (let i = 0; i < Math.min(encoded.length, 32); i++) {
      bytes[i] = encoded[i];
    }
    return bytes;
  }

  function deriveProgramPDA(creatorKey: PublicKey, name: number[]): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("program"), creatorKey.toBuffer(), Buffer.from(name)],
      program.programId,
    );
  }

  function deriveLinkPDA(programPda: PublicKey, referrerKey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("link"), programPda.toBuffer(), referrerKey.toBuffer()],
      program.programId,
    );
  }

  const programName = nameToBytes("Test Referral Program");
  let programPda: PublicKey;
  let programBump: number;
  const referrer = anchor.web3.Keypair.generate();
  let linkPda: PublicKey;

  before(async () => {
    [programPda, programBump] = deriveProgramPDA(creator.publicKey, programName);

    // Airdrop to referrer
    const sig = await provider.connection.requestAirdrop(
      referrer.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig);
  });

  it("Creates a referral program", async () => {
    const platformWallet = anchor.web3.Keypair.generate().publicKey;

    await program.methods
      .createProgram(programName, 1000, 50, platformWallet)
      .accounts({
        referralProgram: programPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.referralProgram.fetch(programPda);
    assert.equal(account.referrerCommissionBps, 1000);
    assert.equal(account.platformFeeBps, 50);
    assert.isTrue(account.active);
    assert.equal(account.totalReferrers, 0);
  });

  it("Referrer joins the program", async () => {
    [linkPda] = deriveLinkPDA(programPda, referrer.publicKey);

    await program.methods
      .joinProgram()
      .accounts({
        referralProgram: programPda,
        referralLink: linkPda,
        referrer: referrer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([referrer])
      .rpc();

    const link = await program.account.referralLink.fetch(linkPda);
    assert.equal(link.referrer.toBase58(), referrer.publicKey.toBase58());
    assert.equal(link.totalReceived.toNumber(), 0);

    const prog = await program.account.referralProgram.fetch(programPda);
    assert.equal(prog.totalReferrers, 1);
  });

  it("Sends SOL to link PDA and distributes", async () => {
    // Send 1 SOL to the link PDA
    const transferIx = SystemProgram.transfer({
      fromPubkey: creator.publicKey,
      toPubkey: linkPda,
      lamports: LAMPORTS_PER_SOL,
    });
    const tx = new anchor.web3.Transaction().add(transferIx);
    await provider.sendAndConfirm(tx);

    const prog = await program.account.referralProgram.fetch(programPda);

    await program.methods
      .distribute()
      .accounts({
        referralProgram: programPda,
        referralLink: linkPda,
        owner: creator.publicKey,
        referrer: referrer.publicKey,
        platform: prog.platformWallet,
        payer: creator.publicKey,
      })
      .rpc();

    const link = await program.account.referralLink.fetch(linkPda);
    assert.isAbove(link.totalReceived.toNumber(), 0);
    assert.isAbove(link.referrerClaimed.toNumber(), 0);
    assert.isAbove(link.ownerClaimed.toNumber(), 0);
  });

  it("Pauses and resumes program", async () => {
    await program.methods
      .pauseProgram(true)
      .accounts({
        referralProgram: programPda,
        creator: creator.publicKey,
      })
      .rpc();

    let prog = await program.account.referralProgram.fetch(programPda);
    assert.isFalse(prog.active);

    await program.methods
      .pauseProgram(false)
      .accounts({
        referralProgram: programPda,
        creator: creator.publicKey,
      })
      .rpc();

    prog = await program.account.referralProgram.fetch(programPda);
    assert.isTrue(prog.active);
  });

  it("Closes link and program", async () => {
    await program.methods
      .closeLink()
      .accounts({
        referralProgram: programPda,
        referralLink: linkPda,
        closer: referrer.publicKey,
      })
      .signers([referrer])
      .rpc();

    await program.methods
      .closeProgram()
      .accounts({
        referralProgram: programPda,
        creator: creator.publicKey,
      })
      .rpc();

    // Verify accounts are closed
    const progAccount = await provider.connection.getAccountInfo(programPda);
    assert.isNull(progAccount);
  });
});
