var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Master palette, sprite DSL and the baked bitmap font (§0.9).
// This is the only file allowed to hold hex colours; everything else names palette keys.
// Nothing here touches the DOM at load time, so the data checks also run in Node.
G.gfx = G.gfx || {};
G.gfx.sprites = (function () {
  var PALETTE = {
    night_ink: '#0b0d17', night_deep: '#131828', night_blue: '#1d2440',
    dusk_violet: '#3b3055', dusk_plum: '#5a3a5e', dusk_rose: '#8a5262',
    dusk_amber: '#b0683e', dusk_high: '#c98a5a',
    fog_dark: '#2b2f3c', fog_mid: '#4b5162', fog_light: '#7a8090',
    water_deep: '#081016', water_dark: '#0f1d26', water_mid: '#18303c', water_hi: '#2e4a56',
    rust_dark: '#3a1f18', rust: '#6b3423', rust_hi: '#9c5230',
    wood_dark: '#24190f', wood: '#4a3322', wood_hi: '#6f4f36',
    moss_dark: '#1f2a1c', moss: '#34442a', moss_hi: '#56663a',
    stone_dark: '#26262a', stone: '#46454a', stone_hi: '#6d6a6c',
    bone: '#d9cfb6', paper: '#c4b896', ink: '#17130f',
    flesh: '#b07868', flesh_dark: '#6e423a',
    blood: '#6a0f18', crimson: '#a0182a',
    neon_red: '#e0403a', neon_teal: '#3ad0c0', signal_amber: '#e8a830', lamp_glow: '#f0d890',
    black: '#000000',
    // Phase 15 (visual detail): the lit top of the water, the waterline, and the painted world.
    water_lit: '#2a5260', water_foam: '#6f97a2',
    mount_far: '#262844', mount_mid: '#2e3050', mount_lit: '#47466a', mount_haze: '#3a3c5c',
    pine_dark: '#111a20', pine_mid: '#1a2830', pine_lit: '#2b4043',
    leaf_dim: '#45261d', leaf_rust: '#83391f', leaf_gold: '#a8742a', birch: '#8c8a82',
    reed_dark: '#2f2a20', reed: '#4f4430', reed_hi: '#6f6040',
    rock_dark: '#1b1e25', rock: '#30343e', rock_lit: '#4c5262',
    dog_dark: '#6e4c2a', dog: '#a87b45', dog_hi: '#cfae78',
    coat_dark: '#2a3426', coat: '#3f4d36', coat_hi: '#5b6b48', cap: '#7a3326',
    // The bait shop's painted interior: the lit side of a face.
    skin_hi: '#cf9a82',
    // Phase 17 (640×360 interiors): longer ramps for wood, stone, skin, cloth, fire and brass.
    wood_deep: '#1a120c', wood_mid: '#5d402a', wood_lit: '#8a6444',
    stone_lit: '#908b88', hair_lit: '#b4b0a6', paper_dark: '#a3956f', cream: '#e6dcc2',
    skin_shadow: '#8e5a4c', skin_lit: '#e0b49a',
    teal_dark: '#16302e', teal: '#22494a', teal_hi: '#356a66', teal_lit: '#4d8a80',
    plum_hi: '#734862', flame: '#e07a2a', brass_hi: '#d0a050', moss_lit: '#7a8a50', rug_hi: '#b8473a',
    // Phase 47 (looks): a yellow oilskin, a faded denim, a darker skin ramp.
    slicker_dark: '#5a4a1c', slicker: '#8a7228', slicker_hi: '#b09a40',
    denim_dark: '#1c2433', denim: '#2c3a50', denim_hi: '#45597a',
    umber_deep: '#2e1c18', umber_dark: '#4a2e24', umber: '#6e4634', umber_hi: '#8e6048',
    // Phase 56 (the shop and the cabin, lofi): 70s panelling, mustard, burnt orange, olive,
    // dusty pink, lavender, a CRT's blue, chrome, brick, a guitar's sunburst, plant greens,
    // vinyl, and a dim pink neon. Interior keys only (INTERIOR below): shift() never picks
    // them, so the fish portraits and every earlier sprite keep their colours.
    panel_deep: '#2a1a10', panel: '#583822', panel_mid: '#72502e', panel_hi: '#8e663c', panel_lit: '#b08350',
    mustard_dark: '#5e4a16', mustard: '#94782a', mustard_hi: '#bc9c40', mustard_lit: '#d8bc68',
    orange_dark: '#62290f', orange: '#9c4a1c', orange_hi: '#c46e30', orange_lit: '#de9850',
    olive_dark: '#2a3016', olive: '#465024', olive_hi: '#68723a', olive_lit: '#8e9656',
    pink_dark: '#5e343c', pink: '#94606a', pink_hi: '#c08c8a', pink_lit: '#dcb4a8',
    lav_dark: '#332c46', lav: '#56507a', lav_hi: '#7e78a0', lav_lit: '#a8a2c2',
    crt_dark: '#0e1e28', crt: '#1c4252', crt_hi: '#367c8c', crt_glow: '#82c4c4',
    chrome_dark: '#353840', chrome: '#626874', chrome_hi: '#9aa0aa', chrome_lit: '#cdd1d6',
    brick_dark: '#3a1a14', brick: '#683024', brick_hi: '#8c4a36',
    leaf_deep: '#14281a', leaf_dark: '#1e3c24', leaf: '#2e5a32', leaf_hi: '#4c7c42', leaf_lit: '#76a456',
    sun_dark: '#32100a', sun: '#702614', sun_hi: '#ac521c', sun_lit: '#d89a40',
    vinyl: '#121016', vinyl_hi: '#3a3642', neon_pink: '#d0507e', neon_pink_hi: '#f0a0b8',
    ivory: '#efe6cc', denim_lit: '#6880a4', outline: '#120e0c',
    // Phase 70 (real fish, PLAN_SPECIES.md 3.5): each species' body ramp, back (dark) to belly
    // (pale), six keys; shared fin ramps (ray, root, membrane, edge); eyes. Fish keys only:
    // shift() never picks them, so no earlier sprite changes colour.
    fish_perch_0: '#2c2a18', fish_perch_1: '#4c4824', fish_perch_2: '#76702e', fish_perch_3: '#a29440', fish_perch_4: '#c6b462', fish_perch_5: '#e0d6aa',
    fish_walleye_0: '#26240f', fish_walleye_1: '#3e3c1e', fish_walleye_2: '#5e5a32', fish_walleye_3: '#827c4a', fish_walleye_4: '#aaa26e', fish_walleye_5: '#d6d2b0',
    fish_smb_0: '#2a2216', fish_smb_1: '#44381f', fish_smb_2: '#62522e', fish_smb_3: '#84703f', fish_smb_4: '#ab9862', fish_smb_5: '#d4cca6',
    fish_lmb_0: '#1e2414', fish_lmb_1: '#323e1f', fish_lmb_2: '#4c5c2b', fish_lmb_3: '#6a7a3e', fish_lmb_4: '#909a60', fish_lmb_5: '#cfcfae',
    fish_rock_0: '#262218', fish_rock_1: '#3d3725', fish_rock_2: '#575036', fish_rock_3: '#766d4a', fish_rock_4: '#9a9268', fish_rock_5: '#c8c3a4',
    fish_blue_0: '#1c2420', fish_blue_1: '#2c3a31', fish_blue_2: '#44553d', fish_blue_3: '#5f6f48', fish_blue_4: '#7f8c5a', fish_blue_5: '#a9ae7c',
    fish_breast_0: '#94622a', fish_breast_1: '#bc8230', fish_breast_2: '#d69e4a', fish_breast_3: '#e6bc7a',
    fish_crap_0: '#1a221e', fish_crap_1: '#27352d', fish_crap_2: '#3c4e40', fish_crap_3: '#586c54', fish_crap_4: '#7e906e', fish_crap_5: '#b4bea0',
    fish_silver_0: '#23271f', fish_silver_1: '#373d31', fish_silver_2: '#54594b', fish_silver_3: '#767b68', fish_silver_4: '#9ca08a', fish_silver_5: '#cbcdba',
    fish_finol_0: '#5a5634', fish_finol_1: '#6c6840', fish_finol_2: '#8c875e', fish_finol_3: '#b0ab88',
    fish_fingr_0: '#585c4e', fish_fingr_1: '#686c5c', fish_fingr_2: '#8a8e7c', fish_fingr_3: '#b0b3a2',
    fish_orange_0: '#9a4826', fish_orange_1: '#b05a2c', fish_orange_2: '#cc7840', fish_orange_3: '#e29c6c',
    // Phase 71: the trouts, salmon, chars and whitefish: body ramps as above, the zones' ramps
    // (a rainbow's band, a char's belly, a sockeye's green head), fin ramps and the markings' keys.
    fish_rainbow_0: '#2e2c1c', fish_rainbow_1: '#4a4630', fish_rainbow_2: '#6c6a4a', fish_rainbow_3: '#928e6e', fish_rainbow_4: '#bab49c', fish_rainbow_5: '#dedacc',
    fish_pinkband_0: '#6e403c', fish_pinkband_1: '#8e5650', fish_pinkband_2: '#ac746a', fish_pinkband_3: '#c89488',
    fish_steel_0: '#262a30', fish_steel_1: '#3a4048', fish_steel_2: '#565e68', fish_steel_3: '#7a828c', fish_steel_4: '#a2a8ae', fish_steel_5: '#ced2d0',
    fish_brown_0: '#3a2a16', fish_brown_1: '#584020', fish_brown_2: '#7c5c2e', fish_brown_3: '#a28040', fish_brown_4: '#c4a462', fish_brown_5: '#e0cc9a',
    fish_brook_0: '#202418', fish_brook_1: '#323a24', fish_brook_2: '#4a5432', fish_brook_3: '#667046', fish_brook_4: '#8a8e62', fish_brook_5: '#c2bea0',
    fish_tiger_0: '#3c2a1a', fish_tiger_1: '#5c4026', fish_tiger_2: '#805a36', fish_tiger_3: '#a2764a', fish_tiger_4: '#c49868', fish_tiger_5: '#e2c8a2',
    fish_cutt_0: '#2a2a20', fish_cutt_1: '#424034', fish_cutt_2: '#5e5a46', fish_cutt_3: '#827660', fish_cutt_4: '#a88a78', fish_cutt_5: '#d2bcac',
    fish_laket_0: '#2c2c1e', fish_laket_1: '#46442c', fish_laket_2: '#666038', fish_laket_3: '#8a8256', fish_laket_4: '#b2aa84', fish_laket_5: '#dad4b8',
    fish_char_0: '#20242a', fish_char_1: '#32383a', fish_char_2: '#484e4a', fish_char_3: '#62665e', fish_char_4: '#86806e', fish_char_5: '#bcb4a2',
    fish_charbelly_0: '#76321e', fish_charbelly_1: '#a0462a', fish_charbelly_2: '#bc5e3c', fish_charbelly_3: '#d4865e',
    fish_dolly_0: '#282c28', fish_dolly_1: '#3c423c', fish_dolly_2: '#565c54', fish_dolly_3: '#74786c', fish_dolly_4: '#9a9a8c', fish_dolly_5: '#cac6ba',
    fish_gray_0: '#262c32', fish_gray_1: '#38424a', fish_gray_2: '#54606a', fish_gray_3: '#76828a', fish_gray_4: '#9ca4a8', fish_gray_5: '#cacbc6',
    fish_sail_0: '#34404e', fish_sail_1: '#465664', fish_sail_2: '#5a7076', fish_sail_3: '#8e5c6c',
    fish_atl_0: '#22282e', fish_atl_1: '#363e48', fish_atl_2: '#525c6a', fish_atl_3: '#788292', fish_atl_4: '#a2a8b4', fish_atl_5: '#ced0d6',
    fish_king_0: '#1e1c1a', fish_king_1: '#302a26', fish_king_2: '#4a3a34', fish_king_3: '#6a463c', fish_king_4: '#8e5c4a', fish_king_5: '#b48a74',
    fish_coho_0: '#1e262e', fish_coho_1: '#303a46', fish_coho_2: '#485464', fish_coho_3: '#687484', fish_coho_4: '#929aa6', fish_coho_5: '#c6cad0',
    fish_sock_0: '#561a14', fish_sock_1: '#7a281e', fish_sock_2: '#9c382a', fish_sock_3: '#b84a38', fish_sock_4: '#ca644e', fish_sock_5: '#d88a72',
    fish_sockhead_0: '#283624', fish_sockhead_1: '#3a4a30', fish_sockhead_2: '#54623e', fish_sockhead_3: '#727e58', fish_sockhead_4: '#989878', fish_sockhead_5: '#beb69a',
    fish_pink_0: '#24282a', fish_pink_1: '#383e3e', fish_pink_2: '#525854', fish_pink_3: '#727670', fish_pink_4: '#9a9a90', fish_pink_5: '#c8c4b8',
    fish_chum_0: '#2a2818', fish_chum_1: '#403c26', fish_chum_2: '#5c5636', fish_chum_3: '#7c7450', fish_chum_4: '#a09470', fish_chum_5: '#c8bc9c',
    fish_masu_0: '#1e2218', fish_masu_1: '#2e341e', fish_masu_2: '#464c2e', fish_masu_3: '#606448', fish_masu_4: '#88886c', fish_masu_5: '#b8b49e',
    fish_wf_0: '#3a3a30', fish_wf_1: '#58584a', fish_wf_2: '#7a7a68', fish_wf_3: '#9e9c86', fish_wf_4: '#c2beaa', fish_wf_5: '#e0dccc',
    fish_wfblue_0: '#2a3038', fish_wfblue_1: '#424a54', fish_wfblue_2: '#646e78', fish_wfblue_3: '#8a9298', fish_wfblue_4: '#b2b8bc', fish_wfblue_5: '#dadcdc',
    fish_finrose_0: '#6e524c', fish_finrose_1: '#866258', fish_finrose_2: '#a8847a', fish_finrose_3: '#ccaca0',
    fish_finblue_0: '#3a4656', fish_finblue_1: '#4a5868', fish_finblue_2: '#667486', fish_finblue_3: '#90a0ae',
    fish_fingold_0: '#86662e', fish_fingold_1: '#a27e38', fish_fingold_2: '#c09c50', fish_fingold_3: '#dcbc7c',
    fish_finred_0: '#76291a', fish_finred_1: '#923824', fish_finred_2: '#b05234', fish_finred_3: '#cc7450',
    fish_findark_0: '#2a2622', fish_findark_1: '#3a3430', fish_findark_2: '#524a42', fish_findark_3: '#706658',
    fish_white: '#e6e2d6', fish_red: '#b8382a', fish_halo: '#5c7ca2', fish_yellow: '#d2b24c', fish_cream: '#d8cea6', fish_calico: '#7a3a34', fish_spot: '#1c1a16', fish_eye_silver: '#b2b2a6',
    fish_eye_gold: '#c49234', fish_eye_red: '#b23a2a', fish_eye_glass: '#a09c74',
    // Phase 72: pikes, suckers, carp and minnows, catfish, burbot, sturgeon, mooneyes, herring and
    // shad, smelt, lingcod, rockfish and halibut: body ramps, fin ramps and the markings' keys.
    fish_pike_0: '#1e2014', fish_pike_1: '#2e3220', fish_pike_2: '#444a2e', fish_pike_3: '#5e6440', fish_pike_4: '#828660', fish_pike_5: '#c8c4a0',
    fish_musk_0: '#2c2a20', fish_musk_1: '#423e30', fish_musk_2: '#5c5644', fish_musk_3: '#7a7258', fish_musk_4: '#a09a7c', fish_musk_5: '#cec8ae',
    fish_tigm_0: '#2e3428', fish_tigm_1: '#465040', fish_tigm_2: '#64705c', fish_tigm_3: '#869480', fish_tigm_4: '#a8b4a0', fish_tigm_5: '#d2d8c8',
    fish_carp_0: '#3e3420', fish_carp_1: '#5a4c2c', fish_carp_2: '#7a6a3c', fish_carp_3: '#9a8a54', fish_carp_4: '#b8a878', fish_carp_5: '#d4c8a4',
    fish_chub_0: '#2e3018', fish_chub_1: '#464a26', fish_chub_2: '#646a3a', fish_chub_3: '#868a5a', fish_chub_4: '#b4b48a', fish_chub_5: '#dcd8c0',
    fish_dace_0: '#30281a', fish_dace_1: '#4a3e26', fish_dace_2: '#6a5a38', fish_dace_3: '#8a7650', fish_dace_4: '#b09a72', fish_dace_5: '#d0c0a0',
    fish_pea_0: '#22272a', fish_pea_1: '#363e42', fish_pea_2: '#525a5e', fish_pea_3: '#767e80', fish_pea_4: '#a0a49a', fish_pea_5: '#cccab8',
    fish_pkm_0: '#1e2222', fish_pkm_1: '#2e3434', fish_pkm_2: '#4a5252', fish_pkm_3: '#6e7474', fish_pkm_4: '#9a9c96', fish_pkm_5: '#c8c6b8',
    fish_wsuck_0: '#3c3424', fish_wsuck_1: '#5a4a30', fish_wsuck_2: '#7c6440', fish_wsuck_3: '#9c8258', fish_wsuck_4: '#bca480', fish_wsuck_5: '#dcd4c4',
    fish_lsuck_0: '#32342a', fish_lsuck_1: '#4c4e40', fish_lsuck_2: '#6a6c5a', fish_lsuck_3: '#8c8a74', fish_lsuck_4: '#b0a888', fish_lsuck_5: '#d4ccb4',
    fish_redh_0: '#3a2e2a', fish_redh_1: '#56463e', fish_redh_2: '#76665a', fish_redh_3: '#968874', fish_redh_4: '#b4a892', fish_redh_5: '#d2cabc',
    fish_lgsuck_0: '#343028', fish_lgsuck_1: '#4e4a3e', fish_lgsuck_2: '#6c6858', fish_lgsuck_3: '#8e8872', fish_lgsuck_4: '#b0a486', fish_lgsuck_5: '#d2c8b0',
    fish_bull_0: '#1a1a16', fish_bull_1: '#262622', fish_bull_2: '#34342e', fish_bull_3: '#4a4a42', fish_bull_4: '#6e6c62', fish_bull_5: '#9a9686',
    fish_chan_0: '#262422', fish_chan_1: '#3a3632', fish_chan_2: '#524c46', fish_chan_3: '#6e665e', fish_chan_4: '#948a80', fish_chan_5: '#c0b8b0',
    fish_burbot_0: '#2a2a20', fish_burbot_1: '#403e2e', fish_burbot_2: '#5a5640', fish_burbot_3: '#767054', fish_burbot_4: '#989070', fish_burbot_5: '#b8b294',
    fish_sturg_0: '#2a2824', fish_sturg_1: '#3e3a34', fish_sturg_2: '#56504a', fish_sturg_3: '#726a62', fish_sturg_4: '#989088', fish_sturg_5: '#c4bcb4',
    fish_moon_0: '#2a3430', fish_moon_1: '#445048', fish_moon_2: '#667464', fish_moon_3: '#8c9a8a', fish_moon_4: '#b6c2b2', fish_moon_5: '#d8dcd0',
    fish_gold_0: '#30383e', fish_gold_1: '#4c5662', fish_gold_2: '#6c7a8c', fish_gold_3: '#949eb4', fish_gold_4: '#b8c0d6', fish_gold_5: '#e0e2ea',
    fish_tshad_0: '#4a4630', fish_tshad_1: '#6a6648', fish_tshad_2: '#8c8862', fish_tshad_3: '#b0aa88', fish_tshad_4: '#d0ccb4', fish_tshad_5: '#e8e6da',
    fish_herring_0: '#2a3640', fish_herring_1: '#3e4e5a', fish_herring_2: '#5e6c76', fish_herring_3: '#8a969c', fish_herring_4: '#b6c0c2', fish_herring_5: '#dcdfdc',
    fish_amshad_0: '#2c3430', fish_amshad_1: '#444c44', fish_amshad_2: '#6a6e5e', fish_amshad_3: '#989682', fish_amshad_4: '#c4bea8', fish_amshad_5: '#e2ded2',
    fish_eul_0: '#2e2c26', fish_eul_1: '#46423a', fish_eul_2: '#625e52', fish_eul_3: '#868070', fish_eul_4: '#aca898', fish_eul_5: '#d0ccc4',
    fish_cap_0: '#2e3a30', fish_cap_1: '#46524a', fish_cap_2: '#6a7466', fish_cap_3: '#9aa092', fish_cap_4: '#c8ccbc', fish_cap_5: '#e6e6dc',
    fish_ling_0: '#2a2620', fish_ling_1: '#3e3830', fish_ling_2: '#564e42', fish_ling_3: '#726858', fish_ling_4: '#948a78', fish_ling_5: '#b8b0a0',
    fish_yeye_0: '#5a2418', fish_yeye_1: '#783222', fish_yeye_2: '#94422c', fish_yeye_3: '#b0583a', fish_yeye_4: '#c6744e', fish_yeye_5: '#d89a72',
    fish_ghal_0: '#1c1814', fish_ghal_1: '#2a241e', fish_ghal_2: '#3a322a', fish_ghal_3: '#4c4236', fish_ghal_4: '#625848', fish_ghal_5: '#7e7462',
    fish_phal_0: '#2a2018', fish_phal_1: '#3e3026', fish_phal_2: '#54402f', fish_phal_3: '#6a5040', fish_phal_4: '#846654', fish_phal_5: '#a08068',
    fish_finpike_0: '#5e4a24', fish_finpike_1: '#74602e', fish_finpike_2: '#96803e', fish_finpike_3: '#b8a060',
    fish_finmusk_0: '#5a3c28', fish_finmusk_1: '#704a30', fish_finmusk_2: '#8e6040', fish_finmusk_3: '#ae8058',
    fish_finsuck_0: '#7a6438', fish_finsuck_1: '#907646', fish_finsuck_2: '#ae9460', fish_finsuck_3: '#c8b07e',
    fish_finbull_0: '#1e1e1a', fish_finbull_1: '#2a2a24', fish_finbull_2: '#3a3a32', fish_finbull_3: '#504e44',
    fish_finchan_0: '#3e3a36', fish_finchan_1: '#4c4842', fish_finchan_2: '#645e56', fish_finchan_3: '#82786e',
    fish_finyel_0: '#8a7a3c', fish_finyel_1: '#a08e46', fish_finyel_2: '#c0aa5c', fish_finyel_3: '#d8c47e',
    fish_bean: '#b0ac78', fish_scute: '#cec6b6', fish_eye_yellow: '#dcbc34', fish_barbel: '#5a524a',
    // Phase 73 (lure art, PLAN_SPECIES.md 3.6): chartreuse, the one lure colour the palette had
    // no ramp for (skirts, firetiger backs, a jig's tail). Lure keys only: shift() never picks them.
    lure_chart_0: '#3a4214', lure_chart_1: '#5e6e1c', lure_chart_2: '#8ea42c', lure_chart_3: '#bccc5a',
    // Phase 80 (PLAN_WINTER.md): snow and ice, pale but under the dusk ceiling (§0.9: checked
    // below with the sky and water keys). Winter keys only: shift() never picks them.
    snow_deep: '#3a4050', snow_dark: '#545a68', snow: '#6e7482', snow_hi: '#82889a', snow_lit: '#8c929c',
    ice_deep: '#1e2c38', ice_dark: '#2a3a48', ice: '#44586a', ice_hi: '#62788a', ice_lit: '#7c8e9c'
  };
  // Phase 80: the (Ice) fish's winter colours, made from the summer fish's ramps: every fish_
  // key gains a pale, cold copy (fish_w_...: desaturated and lifted toward a blue-grey) and a
  // dark, cold one for the deep fish (fish_d_...: desaturated and sunk toward a deep blue).
  (function () {
    var add = {}, k;
    function hx(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    function make(c, to, mix, desat) {
      var h = parseInt(c.slice(1), 16), r = (h >> 16) & 255, g = (h >> 8) & 255, b = h & 255, m = (r + g + b) / 3;
      r += (m - r) * desat; g += (m - g) * desat; b += (m - b) * desat;
      return '#' + hx(r + (to[0] - r) * mix) + hx(g + (to[1] - g) * mix) + hx(b + (to[2] - b) * mix);
    }
    for (k in PALETTE) {
      if (k.indexOf('fish_') !== 0) continue;
      add['fish_w_' + k.slice(5)] = make(PALETTE[k], [168, 178, 192], 0.28, 0.4);
      add['fish_d_' + k.slice(5)] = make(PALETTE[k], [22, 30, 44], 0.3, 0.35);
    }
    for (k in add) PALETTE[k] = add[k];
  })();
  // Phase 56: the interior keys above, which shift() leaves out.
  var INTERIOR = {};
  ('panel_deep panel panel_mid panel_hi panel_lit mustard_dark mustard mustard_hi mustard_lit orange_dark orange orange_hi orange_lit ' +
   'olive_dark olive olive_hi olive_lit pink_dark pink pink_hi pink_lit lav_dark lav lav_hi lav_lit crt_dark crt crt_hi crt_glow ' +
   'chrome_dark chrome chrome_hi chrome_lit brick_dark brick brick_hi leaf_deep leaf_dark leaf leaf_hi leaf_lit sun_dark sun sun_hi sun_lit ' +
   'vinyl vinyl_hi neon_pink neon_pink_hi ivory denim_lit outline').split(' ').forEach(function (k) { INTERIOR[k] = true; });

  // The dusk ceiling: keys whose prefix marks them as sky or water may not be brighter than dusk_high.
  var CEILING_KEY = 'dusk_high';
  var SKY_WATER = /^(night_|dusk_|fog_|water_|snow(_|$)|ice(_|$))/; // Phase 80: snow and ice too

  var RGB = {};
  for (var k in PALETTE) {
    var h = parseInt(PALETTE[k].slice(1), 16);
    RGB[k] = [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  }

  function lumOf(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function lum(key) { var c = RGB[key]; return lumOf(c[0], c[1], c[2]); }
  var CEILING = lum(CEILING_KEY);

  // True when an [r, g, b] colour may be used in the sky or water (e.g. a blended sky ramp).
  function skySafe(r, g, b) { return lumOf(r, g, b) <= CEILING + 0.001; }

  for (k in PALETTE) {
    if (SKY_WATER.test(k) && lum(k) > CEILING + 0.001) throw new Error('palette: ' + k + ' is brighter than ' + CEILING_KEY);
  }

  // shift(key, dir): the palette key that is one step lighter (dir 1) or darker (dir -1)
  // than key in about the same hue; key itself when there is none. Used to shade painted
  // sprites (fishgen portraits) without naming colours.
  var shifted = {};
  function shift(key, dir) {
    var id = key + dir;
    if (shifted[id] !== undefined) return shifted[id];
    var c = RGB[key], L = lum(key), m = (c[0] + c[1] + c[2]) / 3, best = key, bd = 1e9;
    for (var k in PALETTE) {
      if (k === key || k === 'black' || INTERIOR[k] || k.indexOf('fish_') === 0 || k.indexOf('lure_') === 0 || k.indexOf('snow_') === 0 || k.indexOf('ice_') === 0 || k === 'snow' || k === 'ice') continue;
      var dl = (lum(k) - L) * dir;
      if (dl < 8 || dl > 80) continue;
      var q = RGB[k], qm = (q[0] + q[1] + q[2]) / 3;
      var dist = Math.abs((c[0] - m) - (q[0] - qm)) + Math.abs((c[1] - m) - (q[1] - qm)) + Math.abs((c[2] - m) - (q[2] - qm)) + Math.abs(dl - 30) * 0.6;
      if (dist < bd) { bd = dist; best = k; }
    }
    shifted[id] = best;
    return best;
  }

  // ---- Sprite DSL ----------------------------------------------------------
  // def('name', {a: 'rust', b: 'bone'}, frames): frames is one array of row strings, or an
  // array of them for animation. '.' is transparent; every other char must be in the map,
  // and every map value must be a palette key.
  var defs = {};
  var names = [];

  function def(name, map, frames) {
    if (typeof frames[0] === 'string') frames = [frames];
    var h = frames[0].length, w = frames[0][0].length;
    for (var c in map) if (!RGB[map[c]]) throw new Error('sprite ' + name + ': "' + map[c] + '" is not a palette key');
    for (var f = 0; f < frames.length; f++) {
      if (frames[f].length !== h) throw new Error('sprite ' + name + ' frame ' + f + ': height differs');
      for (var y = 0; y < h; y++) {
        var row = frames[f][y];
        if (row.length !== w) throw new Error('sprite ' + name + ' frame ' + f + ' row ' + y + ': width differs');
        for (var x = 0; x < w; x++) {
          var ch = row.charAt(x);
          if (ch !== '.' && !map[ch]) throw new Error('sprite ' + name + ': "' + ch + '" is not in its map');
        }
      }
    }
    if (!defs[name]) names.push(name);
    defs[name] = { name: name, w: w, h: h, n: frames.length, map: map, frames: frames, strip: null, flip: null };
  }

  // All frames side by side in one canvas, baked on first use.
  function strip(d) {
    if (d.strip) return d.strip;
    var cv = G.gfx.bake.canvas(d.w * d.n, d.h), ctx = cv.getContext('2d');
    for (var f = 0; f < d.n; f++) {
      for (var y = 0; y < d.h; y++) {
        var row = d.frames[f][y];
        for (var x = 0; x < d.w; x++) {
          var ch = row.charAt(x);
          if (ch === '.') continue;
          ctx.fillStyle = PALETTE[d.map[ch]];
          ctx.fillRect(f * d.w + x, y, 1, 1);
        }
      }
    }
    d.strip = cv;
    return cv;
  }

  function get(name) {
    var d = defs[name];
    if (!d) throw new Error('unknown sprite: ' + name);
    return d;
  }

  // Draws frame `frame` (wrapped) at whole-pixel x, y. flip mirrors it horizontally.
  function draw(ctx, name, x, y, frame, flip) {
    var d = get(name), f = (frame | 0) % d.n;
    var src = strip(d);
    if (flip) {
      if (!d.flip) d.flip = G.gfx.bake.flipped(src, 'x');
      src = d.flip;
      f = d.n - 1 - f; // the mirrored strip has its frames in reverse order
    }
    ctx.drawImage(src, f * d.w, 0, d.w, d.h, x | 0, y | 0, d.w, d.h);
  }

  // Checks a baked sprite against its definition, pixel by pixel. Returns the number of wrong pixels.
  function verify(name) {
    var d = get(name), cv = strip(d);
    var px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, bad = 0;
    for (var f = 0; f < d.n; f++) {
      for (var y = 0; y < d.h; y++) {
        for (var x = 0; x < d.w; x++) {
          var i = (y * cv.width + f * d.w + x) * 4, ch = d.frames[f][y].charAt(x);
          if (ch === '.') { if (px[i + 3] !== 0) bad++; continue; }
          var c = RGB[d.map[ch]];
          if (px[i] !== c[0] || px[i + 1] !== c[1] || px[i + 2] !== c[2] || px[i + 3] !== 255) bad++;
        }
      }
    }
    return bad;
  }

  // Asymmetric on purpose, so a flip is visible.
  def('test', { o: 'bone', r: 'rust', d: 'night_ink', a: 'signal_amber' }, [
    ['..oooo..',
     '.orrrro.',
     'ordrrdro',
     'orrrrrro',
     'oaarrrro',
     'ordrrdro',
     '.orrrro.',
     '..oooo..'],
    ['..oooo..',
     '.orrrro.',
     'orrrrrro',
     'ordrrdro',
     'oaarrrro',
     'orrrrrro',
     '.orrrro.',
     '..oooo..']
  ]);

  // ---- Bitmap font ---------------------------------------------------------
  // Printable ASCII, 6 rows per glyph: caps and digits use rows 0-4, lowercase x-height is
  // rows 1-4, descenders reach row 5. Widths vary; the advance is width + 1.
  var FONT_H = 6, LINE_H = 8;
  var GLYPHS = {
    ' ': '... ... ... ... ... ...', '!': '# # # . # .', '"': '#.# #.# ... ... ... ...',
    '#': '.#.#. ##### .#.#. ##### .#.#. .....', '$': '.## ##. .#. .## ##. ...',
    '%': '#.# ..# .#. #.. #.# ...', '&': '.#. #.# .#. #.# .## ...', "'": '# # . . . .',
    '(': '.# #. #. #. .# ..', ')': '#. .# .# .# #. ..', '*': '... #.# .#. #.# ... ...',
    '+': '... .#. ### .#. ... ...', ',': '. . . . # #', '-': '... ... ### ... ... ...',
    '.': '. . . . # .', '/': '..# ..# .#. #.. #.. ...',
    '0': '### #.# #.# #.# ### ...', '1': '.#. ##. .#. .#. ### ...', '2': '##. ..# .#. #.. ### ...',
    '3': '##. ..# .#. ..# ##. ...', '4': '#.# #.# ### ..# ..# ...', '5': '### #.. ##. ..# ##. ...',
    '6': '.## #.. ### #.# ### ...', '7': '### ..# .#. .#. .#. ...', '8': '### #.# ### #.# ### ...',
    '9': '### #.# ### ..# ##. ...',
    ':': '. # . # . .', ';': '. # . # # .', '<': '..# .#. #.. .#. ..# ...', '=': '... ### ... ### ... ...',
    '>': '#.. .#. ..# .#. #.. ...', '?': '##. ..# .#. ... .#. ...', '@': '.##. #..# #.## #... .##. ....',
    'A': '.#. #.# ### #.# #.# ...', 'B': '##. #.# ##. #.# ##. ...', 'C': '.## #.. #.. #.. .## ...',
    'D': '##. #.# #.# #.# ##. ...', 'E': '### #.. ##. #.. ### ...', 'F': '### #.. ##. #.. #.. ...',
    'G': '.## #.. #.# #.# .## ...', 'H': '#.# #.# ### #.# #.# ...', 'I': '### .#. .#. .#. ### ...',
    'J': '..# ..# ..# #.# .#. ...', 'K': '#.# #.# ##. #.# #.# ...', 'L': '#.. #.. #.. #.. ### ...',
    'M': '#...# ##.## #.#.# #...# #...# .....', 'N': '#..# ##.# #.## #..# #..# ....',
    'O': '.#. #.# #.# #.# .#. ...', 'P': '##. #.# ##. #.. #.. ...', 'Q': '.#. #.# #.# #.# .## ...',
    'R': '##. #.# ##. #.# #.# ...', 'S': '.## #.. .#. ..# ##. ...', 'T': '### .#. .#. .#. .#. ...',
    'U': '#.# #.# #.# #.# ### ...', 'V': '#.# #.# #.# .#. .#. ...',
    'W': '#...# #...# #.#.# ##.## #...# .....', 'X': '#.# #.# .#. #.# #.# ...',
    'Y': '#.# #.# .#. .#. .#. ...', 'Z': '### ..# .#. #.. ### ...',
    '[': '## #. #. #. ## ..', '\\': '#.. #.. .#. ..# ..# ...', ']': '## .# .# .# ## ..',
    '^': '.#. #.# ... ... ... ...', '_': '... ... ... ... ... ###', '`': '#. .# .. .. .. ..',
    'a': '... .## #.# #.# .## ...', 'b': '#.. ##. #.# #.# ##. ...', 'c': '... .## #.. #.. .## ...',
    'd': '..# .## #.# #.# .## ...', 'e': '... .#. ### #.. .## ...', 'f': '.## #.. ### #.. #.. ...',
    'g': '... .## #.# .## ..# ##.', 'h': '#.. ##. #.# #.# #.# ...', 'i': '# . # # # .',
    'j': '.# .. .# .# .# #.', 'k': '#.. #.# ##. ##. #.# ...', 'l': '#. #. #. #. .# ..',
    'm': '..... ####. #.#.# #.#.# #.#.# .....', 'n': '... ##. #.# #.# #.# ...', 'o': '... .#. #.# #.# .#. ...',
    'p': '... ##. #.# ##. #.. #..', 'q': '... .## #.# .## ..# ..#', 'r': '... #.# ##. #.. #.. ...',
    's': '... .## #.. ..# ##. ...', 't': '.#. ### .#. .#. ..# ...', 'u': '... #.# #.# #.# .## ...',
    'v': '... #.# #.# #.# .#. ...', 'w': '..... #...# #.#.# #.#.# .#.#. .....', 'x': '... #.# .#. .#. #.# ...',
    'y': '... #.# #.# .## ..# ##.', 'z': '... ### ..# .#. ### ...',
    '{': '.## .#. ##. .#. .## ...', '|': '# # # # # #', '}': '##. .#. .## .#. ##. ...',
    '~': '.... .#.# #.#. .... .... ....'
  };

  // Integer hash, used for handwriting jitter so it is deterministic and never touches G.vrng.
  function hash(a, b) {
    var h = Math.imul(a ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul((b + 0x632BE5AB) | 0, 0xC2B2AE35);
    h ^= h >>> 16; h = Math.imul(h, 0x7FEB352D);
    h ^= h >>> 15; h = Math.imul(h, 0x846CA68B);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // A bitmap font from a glyph table (rows of '.' and '#' separated by spaces; a glyph with
  // fewer than h rows is padded with blank rows below). wander is the handwriting jitter's
  // step in pixels. Returns {FONT_H, LINE_H, drawText, measure, wrap, bold, measureBold}.
  function makeFont(glyphs, h, lineH, wander) {
    var gx = new Int16Array(128), gw = new Uint8Array(128), W = 0, rowsOf = {};
    for (var c = 32; c < 127; c++) {
      var ch = String.fromCharCode(c), g = glyphs[ch];
      if (!g) throw new Error('font: missing glyph ' + JSON.stringify(ch));
      var rows = g.split(' ');
      if (rows.length > h) throw new Error('font: glyph ' + JSON.stringify(ch) + ' has more than ' + h + ' rows');
      while (rows.length < h) rows.push(new Array(rows[0].length + 1).join('.'));
      for (var r = 0; r < h; r++) {
        if (rows[r].length !== rows[0].length || /[^.#]/.test(rows[r])) throw new Error('font: glyph ' + JSON.stringify(ch) + ' row ' + r);
      }
      rowsOf[c] = rows; gx[c] = W; gw[c] = rows[0].length; W += rows[0].length;
    }

    var atlas = null;        // opaque glyph mask, baked on first use
    var tinted = {};         // palette key -> atlas recoloured to that key

    function bakeAtlas() {
      atlas = G.gfx.bake.canvas(W, h);
      var ctx = atlas.getContext('2d');
      ctx.fillStyle = PALETTE.bone;
      for (var c = 32; c < 127; c++) {
        for (var y = 0; y < h; y++) for (var x = 0; x < gw[c]; x++) if (rowsOf[c][y].charAt(x) === '#') ctx.fillRect(gx[c] + x, y, 1, 1);
      }
    }

    function fontIn(key) {
      var t = tinted[key];
      if (t) return t;
      if (!RGB[key]) throw new Error('text colour "' + key + '" is not a palette key');
      if (!atlas) bakeAtlas();
      t = G.gfx.bake.canvas(W, h);
      var ctx = t.getContext('2d');
      ctx.drawImage(atlas, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = PALETTE[key];
      ctx.fillRect(0, 0, W, h);
      tinted[key] = t;
      return t;
    }

    function code(str, i) {
      var c = str.charCodeAt(i);
      return (c >= 32 && c < 127) ? c : 63; // anything unprintable draws as '?'
    }

    // Draws str with its top-left at x, y. '\n' starts a new line.
    // jitter 0..1 is the "handwriting" amount: glyphs wander up to one step (two above 0.66)
    // and spacing loosens. The same str, seed and jitter always give the same pixels.
    // extra widens each glyph by drawing it again 1 px to the right (bold).
    function draw(ctx, str, x, y, colorKey, jitter, seed, extra) {
      var img = fontIn(colorKey || 'bone'), cx = x | 0, cy = y | 0;
      jitter = jitter || 0; seed = seed | 0; extra = extra | 0;
      for (var i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) === 10) { cx = x | 0; cy += lineH; continue; }
        var c = code(str, i), dx = 0, dy = 0;
        if (jitter > 0) {
          var hh = hash(seed, i);
          if ((hh & 1023) < jitter * 1024) dy = (hh & 1024) ? wander : -wander;
          if (jitter > 0.66 && ((hh >>> 11) & 1023) < (jitter - 0.66) * 3 * 1024) dy *= 2;
          if (((hh >>> 21) & 255) < jitter * 96) dx = (hh & (1 << 30)) ? 1 : 0;
        }
        ctx.drawImage(img, gx[c], 0, gw[c], h, cx + dx, cy + dy, gw[c], h);
        if (extra) ctx.drawImage(img, gx[c], 0, gw[c], h, cx + dx + 1, cy + dy, gw[c], h);
        cx += gw[c] + 1 + extra + dx;
      }
    }

    // Width in pixels of the widest line (without jitter).
    function measureW(str, extra) {
      var w = 0, best = 0;
      for (var i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) === 10) { if (w > best) best = w; w = 0; continue; }
        w += gw[code(str, i)] + 1 + extra;
      }
      if (w > best) best = w;
      return best > 0 ? best - 1 : 0;
    }
    function measure(str) { return measureW(str, 0); }

    // Splits text into lines no wider than width px, breaking between words.
    function wrap(text, width) {
      var words = text.split(' '), out = [], line = '';
      for (var i = 0; i < words.length; i++) {
        var next = line ? line + ' ' + words[i] : words[i];
        if (measure(next) > width && line) { out.push(line); line = words[i]; } else line = next;
      }
      if (line) out.push(line);
      return out;
    }

    return {
      FONT_H: h, LINE_H: lineH, measure: measure, wrap: wrap,
      drawText: function (ctx, str, x, y, key, jitter, seed) { draw(ctx, str, x, y, key, jitter, seed, 0); },
      bold: function (ctx, str, x, y, key) { draw(ctx, str, x, y, key, 0, 0, 1); },
      measureBold: function (str) { return measureW(str, 1); }
    };
  }

  // The 320×180 font (scenes not yet converted to 640×360) and the fine font of the 640×360
  // scenes (Phase 17): capitals 7 px tall, x-height 5, descenders 2.
  var BASE = makeFont(GLYPHS, FONT_H, LINE_H, 1);
  var FINE = makeFont({
    ' ': '... ...',
    '!': '# # # # # . #', '"': '#.# #.#', '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.',
    '$': '..#.. .#### #.#.. .###. ..#.# ####. ..#..', '%': '##... ##..# ...#. ..#.. .#... #..## ...##',
    '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#', "'": '# #',
    '(': '..# .#. #.. #.. #.. .#. ..#', ')': '#.. .#. ..# ..# ..# .#. #..',
    '*': '..... ..#.. #.#.# .###. #.#.# ..#..', '+': '..... ..#.. ..#.. ##### ..#.. ..#..',
    ',': '.. .. .. .. .. .# .# #.', '-': '.... .... .... #### ....', '.': '.. .. .. .. .. ## ##',
    '/': '....# ....# ...#. ..#.. .#... #.... #....',
    '0': '.###. #...# #..## #.#.# ##..# #...# .###.', '1': '.#. ##. .#. .#. .#. .#. ###',
    '2': '.###. #...# ....# ...#. ..#.. .#... #####', '3': '##### ...#. ..#.. ...#. ....# #...# .###.',
    '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.', '5': '##### #.... ####. ....# ....# #...# .###.',
    '6': '..##. .#... #.... ####. #...# #...# .###.', '7': '##### ....# ...#. ..#.. .#... .#... .#...',
    '8': '.###. #...# #...# .###. #...# #...# .###.', '9': '.###. #...# #...# .#### ....# ...#. .##..',
    ':': '.. .. ## ## .. ## ##', ';': '.. .. ## ## .. ## ## #.',
    '<': '...# ..#. .#.. #... .#.. ..#. ...#', '=': '.... .... #### .... #### ....',
    '>': '#... .#.. ..#. ...# ..#. .#.. #...', '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
    '@': '.###. #...# #.### #.#.# #.### #.... .###.',
    'A': '.###. #...# #...# ##### #...# #...# #...#', 'B': '####. #...# #...# ####. #...# #...# ####.',
    'C': '.###. #...# #.... #.... #.... #...# .###.', 'D': '####. #...# #...# #...# #...# #...# ####.',
    'E': '##### #.... #.... ####. #.... #.... #####', 'F': '##### #.... #.... ####. #.... #.... #....',
    'G': '.###. #...# #.... #.### #...# #...# .####', 'H': '#...# #...# #...# ##### #...# #...# #...#',
    'I': '### .#. .#. .#. .#. .#. ###', 'J': '...# ...# ...# ...# ...# #..# .##.',
    'K': '#...# #..#. #.#.. ##... #.#.. #..#. #...#', 'L': '#.... #.... #.... #.... #.... #.... #####',
    'M': '#...# ##.## #.#.# #.#.# #...# #...# #...#', 'N': '#...# #...# ##..# #.#.# #..## #...# #...#',
    'O': '.###. #...# #...# #...# #...# #...# .###.', 'P': '####. #...# #...# ####. #.... #.... #....',
    'Q': '.###. #...# #...# #...# #.#.# #..#. .##.#', 'R': '####. #...# #...# ####. #.#.. #..#. #...#',
    'S': '.#### #.... #.... .###. ....# ....# ####.', 'T': '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
    'U': '#...# #...# #...# #...# #...# #...# .###.', 'V': '#...# #...# #...# #...# #...# .#.#. ..#..',
    'W': '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.', 'X': '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    'Y': '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', 'Z': '##### ....# ...#. ..#.. .#... #.... #####',
    '[': '### #.. #.. #.. #.. #.. ###', '\\': '#.... #.... .#... ..#.. ...#. ....# ....#',
    ']': '### ..# ..# ..# ..# ..# ###', '^': '..#.. .#.#. #...#', '_': '..... ..... ..... ..... ..... ..... ..... #####',
    '`': '#. .#',
    'a': '..... ..... .###. ....# .#### #...# .####', 'b': '#.... #.... #.##. ##..# #...# #...# ####.',
    'c': '.... .... .### #... #... #... .###', 'd': '....# ....# .##.# #..## #...# #...# .####',
    'e': '..... ..... .###. #...# ##### #.... .###.', 'f': '..## .#.. #### .#.. .#.. .#.. .#..',
    'g': '..... ..... .#### #...# #...# #...# .#### ....# .###.', 'h': '#.... #.... #.##. ##..# #...# #...# #...#',
    'i': '.#. ... ##. .#. .#. .#. ###', 'j': '...# .... ..## ...# ...# ...# ...# #..# .##.',
    'k': '#... #... #..# #.#. ##.. #.#. #..#', 'l': '##. .#. .#. .#. .#. .#. ###',
    'm': '..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#', 'n': '..... ..... #.##. ##..# #...# #...# #...#',
    'o': '..... ..... .###. #...# #...# #...# .###.', 'p': '..... ..... ####. #...# #...# #...# ####. #.... #....',
    'q': '..... ..... .#### #...# #...# #...# .#### ....# ....#', 'r': '.... .... #.## ##.. #... #... #...',
    's': '.... .... .### #... .##. ...# ###.', 't': '.#.. .#.. #### .#.. .#.. .#.. ..##',
    'u': '..... ..... #...# #...# #...# #..## .##.#', 'v': '..... ..... #...# #...# #...# .#.#. ..#..',
    'w': '..... ..... #...# #...# #.#.# #.#.# .#.#.', 'x': '..... ..... #...# .#.#. ..#.. .#.#. #...#',
    'y': '..... ..... #...# #...# #...# #...# .#### ....# .###.', 'z': '..... ..... ##### ...#. ..#.. .#... #####',
    '{': '..## .#.. .#.. #... .#.. .#.. ..##', '|': '# # # # # # # # #', '}': '##.. ..#. ..#. ...# ..#. ..#. ##..',
    '~': '..... ..... .#... #.#.# ...#.'
  }, 9, 12, 1);

  return {
    PALETTE: PALETTE, RGB: RGB, CEILING_KEY: CEILING_KEY, CEILING: CEILING, SKY_WATER: SKY_WATER,
    lum: lum, skySafe: skySafe, shift: shift,
    def: def, get: get, draw: draw, verify: verify, names: names,
    FONT_H: FONT_H, LINE_H: LINE_H, drawText: BASE.drawText, measure: BASE.measure, wrap: BASE.wrap, hash: hash,
    makeFont: makeFont, fine: FINE
  };
})();
