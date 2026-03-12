module blockral::referral {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;

    // ===== Error codes =====
    const EEmptyName: u64 = 0;
    const EInvalidCommissionRate: u64 = 1;
    const EInvalidPlatformFee: u64 = 2;
    const EProgramNotActive: u64 = 3;
    const EAlreadyPaused: u64 = 4;
    const EAlreadyActive: u64 = 5;
    const ENothingToClaim: u64 = 6;
    const EUnauthorized: u64 = 7;
    const ELinkHasBalance: u64 = 8;
    const EProgramHasLinks: u64 = 9;

    const MAX_COMMISSION_BPS: u64 = 5000; // 50%
    const MIN_COMMISSION_BPS: u64 = 1;    // 0.01%
    const MAX_PLATFORM_FEE_BPS: u64 = 1000; // 10%
    const BPS_TOTAL: u64 = 10000;

    // ===== Objects =====

    /// Admin capability for the program creator.
    public struct ProgramAdminCap has key, store {
        id: UID,
        program_id: address,
    }

    /// A referral program with commission settings.
    public struct ReferralProgram has key {
        id: UID,
        creator: address,
        name: vector<u8>,
        commission_bps: u64,
        platform_fee_bps: u64,
        platform_wallet: address,
        verification_authority: address,
        total_payments: u64,
        total_referrers: u64,
        active: bool,
        created_at: u64,
    }

    /// A referral link belonging to a referrer in a program.
    public struct ReferralLink has key {
        id: UID,
        program_id: address,
        referrer: address,
        vault: Balance<SUI>,
        total_received: u64,
        referrer_claimed: u64,
        owner_claimed: u64,
        platform_claimed: u64,
        payment_count: u64,
        created_at: u64,
    }

    // ===== Events =====

    public struct ProgramCreated has copy, drop {
        program_id: address,
        creator: address,
        name: vector<u8>,
        commission_bps: u64,
    }

    public struct LinkCreated has copy, drop {
        link_id: address,
        program_id: address,
        referrer: address,
    }

    public struct PaymentReceived has copy, drop {
        link_id: address,
        amount: u64,
    }

    // ===== Entry functions =====

    /// Create a new referral program.
    entry fun create_program(
        name: vector<u8>,
        commission_bps: u64,
        platform_fee_bps: u64,
        platform_wallet: address,
        verification_authority: address,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&name) > 0, EEmptyName);
        assert!(commission_bps >= MIN_COMMISSION_BPS && commission_bps <= MAX_COMMISSION_BPS, EInvalidCommissionRate);
        assert!(platform_fee_bps <= MAX_PLATFORM_FEE_BPS, EInvalidPlatformFee);

        let creator = tx_context::sender(ctx);
        let program = ReferralProgram {
            id: object::new(ctx),
            creator,
            name: name,
            commission_bps,
            platform_fee_bps,
            platform_wallet,
            verification_authority,
            total_payments: 0,
            total_referrers: 0,
            active: true,
            created_at: tx_context::epoch(ctx),
        };

        let program_id = object::uid_to_address(&program.id);

        let cap = ProgramAdminCap {
            id: object::new(ctx),
            program_id,
        };

        event::emit(ProgramCreated {
            program_id,
            creator,
            name: program.name,
            commission_bps,
        });

        transfer::share_object(program);
        transfer::transfer(cap, creator);
    }

    /// Join a referral program as a referrer.
    entry fun join_program(
        program: &mut ReferralProgram,
        ctx: &mut TxContext,
    ) {
        assert!(program.active, EProgramNotActive);

        let referrer = tx_context::sender(ctx);
        let program_id = object::uid_to_address(&program.id);

        let link = ReferralLink {
            id: object::new(ctx),
            program_id,
            referrer,
            vault: balance::zero<SUI>(),
            total_received: 0,
            referrer_claimed: 0,
            owner_claimed: 0,
            platform_claimed: 0,
            payment_count: 0,
            created_at: tx_context::epoch(ctx),
        };

        let link_id = object::uid_to_address(&link.id);
        program.total_referrers = program.total_referrers + 1;

        event::emit(LinkCreated {
            link_id,
            program_id,
            referrer,
        });

        transfer::share_object(link);
    }

    /// Pay into a referral link (deposit SUI).
    entry fun pay(
        link: &mut ReferralLink,
        program: &mut ReferralProgram,
        payment: Coin<SUI>,
    ) {
        let amount = coin::value(&payment);
        link.total_received = link.total_received + amount;
        link.payment_count = link.payment_count + 1;
        program.total_payments = program.total_payments + 1;
        balance::join(&mut link.vault, coin::into_balance(payment));

        event::emit(PaymentReceived {
            link_id: object::uid_to_address(&link.id),
            amount,
        });
    }

    /// Distribute vault funds: commission to referrer, platform fee, remainder to owner.
    entry fun distribute(
        program: &ReferralProgram,
        link: &mut ReferralLink,
        ctx: &mut TxContext,
    ) {
        let vault_amount = balance::value(&link.vault);
        assert!(vault_amount > 0, ENothingToClaim);

        // Calculate splits
        let referrer_share = (vault_amount * program.commission_bps) / BPS_TOTAL;
        let platform_share = (vault_amount * program.platform_fee_bps) / BPS_TOTAL;
        let owner_share = vault_amount - referrer_share - platform_share;

        // Transfer to referrer
        if (referrer_share > 0) {
            let coin = coin::from_balance(balance::split(&mut link.vault, referrer_share), ctx);
            transfer::public_transfer(coin, link.referrer);
            link.referrer_claimed = link.referrer_claimed + referrer_share;
        };

        // Transfer platform fee
        if (platform_share > 0) {
            let coin = coin::from_balance(balance::split(&mut link.vault, platform_share), ctx);
            transfer::public_transfer(coin, program.platform_wallet);
            link.platform_claimed = link.platform_claimed + platform_share;
        };

        // Transfer remainder to program creator (owner)
        if (owner_share > 0) {
            let coin = coin::from_balance(balance::split(&mut link.vault, owner_share), ctx);
            transfer::public_transfer(coin, program.creator);
            link.owner_claimed = link.owner_claimed + owner_share;
        };
    }

    /// Referrer claims their commission share (pull model).
    entry fun claim_referrer(
        program: &ReferralProgram,
        link: &mut ReferralLink,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == link.referrer, EUnauthorized);

        let vault_amount = balance::value(&link.vault);
        assert!(vault_amount > 0, ENothingToClaim);

        let referrer_share = (vault_amount * program.commission_bps) / BPS_TOTAL;
        assert!(referrer_share > 0, ENothingToClaim);

        let coin = coin::from_balance(balance::split(&mut link.vault, referrer_share), ctx);
        transfer::public_transfer(coin, sender);
        link.referrer_claimed = link.referrer_claimed + referrer_share;
    }

    /// Owner claims their share from a link (pull model).
    entry fun claim_owner(
        program: &ReferralProgram,
        link: &mut ReferralLink,
        cap: &ProgramAdminCap,
        ctx: &mut TxContext,
    ) {
        assert!(cap.program_id == object::uid_to_address(&program.id), EUnauthorized);

        let vault_amount = balance::value(&link.vault);
        assert!(vault_amount > 0, ENothingToClaim);

        let referrer_share = (vault_amount * program.commission_bps) / BPS_TOTAL;
        let platform_share = (vault_amount * program.platform_fee_bps) / BPS_TOTAL;
        let owner_share = vault_amount - referrer_share - platform_share;
        assert!(owner_share > 0, ENothingToClaim);

        let coin = coin::from_balance(balance::split(&mut link.vault, owner_share), ctx);
        transfer::public_transfer(coin, program.creator);
        link.owner_claimed = link.owner_claimed + owner_share;
    }

    /// Pause or resume a referral program.
    entry fun pause_program(
        cap: &ProgramAdminCap,
        program: &mut ReferralProgram,
        pause: bool,
    ) {
        assert!(cap.program_id == object::uid_to_address(&program.id), EUnauthorized);
        if (pause) {
            assert!(program.active, EAlreadyPaused);
            program.active = false;
        } else {
            assert!(!program.active, EAlreadyActive);
            program.active = true;
        };
    }

    /// Close a referral link. Referrer or creator only, vault must be empty.
    entry fun close_link(
        program: &mut ReferralProgram,
        link: ReferralLink,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == link.referrer || sender == program.creator, EUnauthorized);
        assert!(balance::value(&link.vault) == 0, ELinkHasBalance);

        program.total_referrers = program.total_referrers - 1;

        let ReferralLink {
            id, program_id: _, referrer: _, vault,
            total_received: _, referrer_claimed: _, owner_claimed: _,
            platform_claimed: _, payment_count: _, created_at: _,
        } = link;
        balance::destroy_zero(vault);
        object::delete(id);
    }

    /// Close a referral program. Creator only, must have no referrers.
    entry fun close_program(
        cap: ProgramAdminCap,
        program: ReferralProgram,
        _ctx: &TxContext,
    ) {
        assert!(cap.program_id == object::uid_to_address(&program.id), EUnauthorized);
        assert!(program.total_referrers == 0, EProgramHasLinks);

        let ProgramAdminCap { id: cap_id, program_id: _ } = cap;
        object::delete(cap_id);

        let ReferralProgram {
            id, creator: _, name: _, commission_bps: _, platform_fee_bps: _,
            platform_wallet: _, verification_authority: _, total_payments: _,
            total_referrers: _, active: _, created_at: _,
        } = program;
        object::delete(id);
    }

    // ===== View functions =====

    public fun get_program_creator(program: &ReferralProgram): address { program.creator }
    public fun get_program_name(program: &ReferralProgram): vector<u8> { program.name }
    public fun get_commission_bps(program: &ReferralProgram): u64 { program.commission_bps }
    public fun is_active(program: &ReferralProgram): bool { program.active }
    public fun get_total_referrers(program: &ReferralProgram): u64 { program.total_referrers }
    public fun get_link_vault_balance(link: &ReferralLink): u64 { balance::value(&link.vault) }
    public fun get_link_referrer(link: &ReferralLink): address { link.referrer }

    // ===== Tests =====

    #[test_only]
    use sui::test_scenario;

    #[test]
    fun test_create_program() {
        let creator = @0xA;
        let mut scenario = test_scenario::begin(creator);

        {
            let ctx = test_scenario::ctx(&mut scenario);
            create_program(
                b"Test Program",
                1000, // 10% commission
                50,   // 0.5% platform fee
                @0xFACE,
                @0x0,  // no verification
                ctx,
            );
        };

        test_scenario::next_tx(&mut scenario, creator);
        {
            let program = test_scenario::take_shared<ReferralProgram>(&scenario);
            assert!(get_program_creator(&program) == creator);
            assert!(get_program_name(&program) == b"Test Program");
            assert!(get_commission_bps(&program) == 1000);
            assert!(is_active(&program));
            assert!(get_total_referrers(&program) == 0);
            test_scenario::return_shared(program);

            let cap = test_scenario::take_from_sender<ProgramAdminCap>(&scenario);
            test_scenario::return_to_sender(&scenario, cap);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_join_and_pay() {
        let creator = @0xA;
        let referrer = @0xB;
        let buyer = @0xC;
        let mut scenario = test_scenario::begin(creator);

        // Create program: 10% commission, 0.5% platform
        {
            let ctx = test_scenario::ctx(&mut scenario);
            create_program(b"Prog", 1000, 50, @0xFACE, @0x0, ctx);
        };

        // Referrer joins
        test_scenario::next_tx(&mut scenario, referrer);
        {
            let mut program = test_scenario::take_shared<ReferralProgram>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            join_program(&mut program, ctx);
            assert!(get_total_referrers(&program) == 1);
            test_scenario::return_shared(program);
        };

        // Buyer pays 1 SUI
        test_scenario::next_tx(&mut scenario, buyer);
        {
            let mut link = test_scenario::take_shared<ReferralLink>(&scenario);
            let mut program = test_scenario::take_shared<ReferralProgram>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, ctx);
            pay(&mut link, &mut program, payment);
            assert!(get_link_vault_balance(&link) == 1_000_000_000);
            test_scenario::return_shared(link);
            test_scenario::return_shared(program);
        };

        // Distribute
        test_scenario::next_tx(&mut scenario, creator);
        {
            let mut link = test_scenario::take_shared<ReferralLink>(&scenario);
            let program = test_scenario::take_shared<ReferralProgram>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            distribute(&program, &mut link, ctx);
            assert!(get_link_vault_balance(&link) == 0);
            test_scenario::return_shared(link);
            test_scenario::return_shared(program);
        };

        // Verify referrer got 10% (100_000_000)
        test_scenario::next_tx(&mut scenario, referrer);
        {
            let coin = test_scenario::take_from_address<Coin<SUI>>(&scenario, referrer);
            assert!(coin::value(&coin) == 100_000_000);
            test_scenario::return_to_address(referrer, coin);
        };

        // Verify platform got 0.5% (5_000_000)
        test_scenario::next_tx(&mut scenario, @0xFACE);
        {
            let coin = test_scenario::take_from_address<Coin<SUI>>(&scenario, @0xFACE);
            assert!(coin::value(&coin) == 5_000_000);
            test_scenario::return_to_address(@0xFACE, coin);
        };

        // Verify owner got remainder (895_000_000)
        test_scenario::next_tx(&mut scenario, creator);
        {
            let coin = test_scenario::take_from_address<Coin<SUI>>(&scenario, creator);
            assert!(coin::value(&coin) == 895_000_000);
            test_scenario::return_to_address(creator, coin);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_pause_program() {
        let creator = @0xA;
        let mut scenario = test_scenario::begin(creator);

        {
            let ctx = test_scenario::ctx(&mut scenario);
            create_program(b"Pause", 1000, 50, @0xFACE, @0x0, ctx);
        };

        test_scenario::next_tx(&mut scenario, creator);
        {
            let mut program = test_scenario::take_shared<ReferralProgram>(&scenario);
            let cap = test_scenario::take_from_sender<ProgramAdminCap>(&scenario);
            pause_program(&cap, &mut program, true);
            assert!(!is_active(&program));
            pause_program(&cap, &mut program, false);
            assert!(is_active(&program));
            test_scenario::return_shared(program);
            test_scenario::return_to_sender(&scenario, cap);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = EInvalidCommissionRate)]
    fun test_invalid_commission() {
        let creator = @0xA;
        let mut scenario = test_scenario::begin(creator);
        {
            let ctx = test_scenario::ctx(&mut scenario);
            create_program(b"Bad", 6000, 50, @0xFACE, @0x0, ctx);
        };
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = EProgramNotActive)]
    fun test_join_paused_program() {
        let creator = @0xA;
        let referrer = @0xB;
        let mut scenario = test_scenario::begin(creator);

        {
            let ctx = test_scenario::ctx(&mut scenario);
            create_program(b"Paused", 1000, 50, @0xFACE, @0x0, ctx);
        };

        test_scenario::next_tx(&mut scenario, creator);
        {
            let mut program = test_scenario::take_shared<ReferralProgram>(&scenario);
            let cap = test_scenario::take_from_sender<ProgramAdminCap>(&scenario);
            pause_program(&cap, &mut program, true);
            test_scenario::return_shared(program);
            test_scenario::return_to_sender(&scenario, cap);
        };

        test_scenario::next_tx(&mut scenario, referrer);
        {
            let mut program = test_scenario::take_shared<ReferralProgram>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            join_program(&mut program, ctx);
            test_scenario::return_shared(program);
        };

        test_scenario::end(scenario);
    }
}
