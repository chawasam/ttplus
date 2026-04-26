// data/maps.js — Zone definitions, explore events, atmosphere for Ashenveil

const ZONES = {

  town_square: {
    zoneId: 'town_square',
    name: 'Town Square', nameTH: 'จัตุรัสกลางเมือง',
    shard: 'starter', level: [1, 99],
    atmosphere: [
      'ตลาดคึกคัก เสียงดาบเหล็กดังเป็นจังหวะจากร้านช่างตีเหล็ก',
      'เด็กๆ วิ่งเล่นรอบน้ำพุกลางเมือง น้ำในอ่างใสจนมองเห็นก้น',
      'กลิ่นขนมปังอบร้อนลอยมาจากร้านเบเกอรี่ข้างๆ',
      'พ่อค้าแม่ขายกำลังเรียกลูกค้า เสียงต่อรองราคาดังไปทั่ว',
    ],
    canFight: false, canExplore: false,
    npcs: ['mira', 'erik', 'yena'],
    connections: ['town_outskirts', 'forest_path', 'city_ruins'],
    icon: '🏘️',
    minLevel: 1,
  },

  town_outskirts: {
    zoneId: 'town_outskirts',
    name: 'Town Outskirts', nameTH: 'ชานเมือง',
    shard: 'starter', level: [1, 5],
    zoneBossId: 'outskirts_boss',
    atmosphere: [
      'ทุ่งหญ้าโล่งกว้าง ลมเย็นพัดผ่าน ไม่มีต้นไม้บังแสง',
      'รอยเท้าสัตว์หลายชนิดบนดินชื้น บางอันใหญ่ผิดปกติ',
      'กระท่อมร้างอยู่ไกลออกไป หน้าต่างแตก ประตูเปิดค้าง',
      'ดอกไม้ป่าสีชมพูขึ้นรกร้างทั่วไป หอมอ่อนๆ',
      'ก้อนหินก้อนหนึ่งมีรอยขีดเขียนประหลาด... อ่านไม่ออก',
    ],
    canFight: true, canExplore: true,
    monsters: ['stray_dog', 'goblin_scout'],
    icon: '🌾',
    minLevel: 1,
    connections: ['town_square', 'forest_path'],
    events: [
      { id: 'find_flowers', weight: 20, result: { type: 'item', items: ['wild_flower'], gold: 0, msg: 'คุณพบดอกไม้ป่าสีชมพูขึ้นอยู่ริมทาง...' } },
      { id: 'find_gold',   weight: 15, result: { type: 'gold', gold: [3, 12], msg: 'มีกระเป๋าหนังเก่าอยู่ใต้พุ่มไม้ ภายในมีเหรียญเล็กน้อย' } },
      { id: 'find_ore',    weight: 10, result: { type: 'item', items: ['iron_ore'], gold: 0, msg: 'พบก้อนแร่โผล่จากดิน ดูมีค่าพอสมควร' } },
      { id: 'encounter',   weight: 35, result: { type: 'encounter', msg: 'บางอย่างเคลื่อนไหวในพุ่มไม้...' } },
      { id: 'nothing_1',   weight: 10, result: { type: 'nothing', msg: 'เดินวนดูรอบๆ ไม่พบอะไรน่าสนใจ ลมพัดเย็นสบาย' } },
      { id: 'nothing_2',   weight: 10, result: { type: 'nothing', msg: 'สงบ ใบไม้ร่วงช้าๆ เสียงนกร้องไกลๆ' } },
    ],
  },

  forest_path: {
    zoneId: 'forest_path',
    name: 'Forest Path', nameTH: 'ทางป่า',
    shard: 'starter', level: [3, 10],
    zoneBossId: 'forest_boss',
    atmosphere: [
      'ป่าทึบ แสงแดดส่องทะลุมาเป็นลำบางๆ พื้นดินปกคลุมด้วยใบไม้เก่า',
      'เสียงกิ่งไม้หักดังๆ แต่ไม่มีอะไรให้เห็น',
      'รังผึ้งขนาดใหญ่แขวนอยู่บนกิ่งสูง ผึ้งบินวนไม่หยุด',
      'ต้นไม้ต้นหนึ่งมีรอยเกือกตะปูลึกมาก เหมือนถูกอะไรบางอย่างกรงเล็บ',
      'น้ำตกเล็กๆ ซ่อนอยู่หลังพุ่มไม้ ข้างๆ มีรอยเท้าสัตว์แปลกๆ',
      'กลิ่นเลือดอ่อนๆ ลอยมาตามลม... มาจากทิศไหนไม่แน่ใจ',
    ],
    canFight: true, canExplore: true,
    monsters: ['forest_wolf', 'goblin_warrior', 'giant_spider', 'ancient_treant'],
    icon: '🌲',
    minLevel: 3,
    connections: ['town_square', 'dark_cave'],
    events: [
      { id: 'find_herb',   weight: 15, result: { type: 'item', items: ['wild_flower', 'forget_me_not'], gold: 0, msg: 'ในซอกหินพบดอกไม้หายาก กลีบดูแปลกกว่าดอกทั่วไป' } },
      { id: 'find_honey',  weight: 8,  result: { type: 'item', items: ['honey_jar'], gold: 0, msg: 'รังผึ้งร้างอยู่บนกิ่งต่ำ ยังมีน้ำผึ้งเหลืออยู่บ้าง' } },
      { id: 'find_gem',    weight: 5,  result: { type: 'item', items: ['blue_gem_fragment'], gold: 0, msg: 'บางอย่างแวววาวอยู่ใต้รากไม้... เป็นเศษอัญมณี' } },
      { id: 'find_gold',   weight: 12, result: { type: 'gold', gold: [8, 25], msg: 'พบกระสอบเล็กหล่นอยู่ เหมือนใครทำหายไว้' } },
      { id: 'find_potion', weight: 10, result: { type: 'item', items: ['health_potion_small'], gold: 0, msg: 'ขวดยาเก่าวางอยู่บนก้อนหิน ยังไม่ได้เปิด' } },
      { id: 'encounter',   weight: 38, result: { type: 'encounter', msg: 'เสียงก้าวเท้าหนักๆ เข้ามาใกล้...' } },
      { id: 'nothing_1',   weight: 7,  result: { type: 'nothing', msg: 'ป่าเงียบผิดปกติ แม้แต่นกก็ไม่ร้อง' } },
      { id: 'nothing_2',   weight: 5,  result: { type: 'nothing', msg: 'เดินไปเรื่อยๆ ต้นไม้ทุกต้นดูเหมือนกันหมด' } },
    ],
  },

  dark_cave: {
    zoneId: 'dark_cave',
    name: 'Dark Cave', nameTH: 'ถ้ำมืด',
    shard: 'starter', level: [5, 15],
    zoneBossId: 'cave_boss',
    atmosphere: [
      'มืดสนิท เสียงหยดน้ำดังเป็นจังหวะ ไม่รู้ว่ามาจากไหน',
      'ผนังถ้ำมีผลึกแร่เล็กๆ เปล่งแสงน้ำเงินอ่อนๆ',
      'มีกระดูกสัตว์กองอยู่มุมหนึ่ง ยังสด... เพิ่งกินเมื่อกี้นี้เอง',
      'รู้สึกว่ามีสายตาจับอยู่ แต่มองไปรอบๆ ไม่เห็นอะไร',
      'อากาศเย็นฉ่ำ เหมือนลมพัดมาจากก้นบึ้งที่ลึกกว่า',
    ],
    canFight: true, canExplore: true,
    monsters: ['cave_bat', 'cave_troll', 'void_wisp'],
    icon: '🕳️',
    minLevel: 5,
    connections: ['forest_path', 'city_ruins'],
    events: [
      { id: 'find_crystal',     weight: 15, result: { type: 'item', items: ['crystal_shard'], gold: 0, msg: 'ในซอกหิน พบเศษคริสตัลแวววาวแม้ในความมืด' } },
      { id: 'find_gem',         weight: 10, result: { type: 'item', items: ['blue_gem_fragment'], gold: 0, msg: 'ผนังถ้ำมีก้อนแร่โผล่ออกมา ใช้มือขุดออกได้' } },
      { id: 'find_ore',         weight: 15, result: { type: 'item', items: ['iron_ore', 'iron_ore'], gold: 0, msg: 'แร่เหล็กจำนวนมากฝังอยู่ในผนัง' } },
      { id: 'find_scroll',      weight: 5,  result: { type: 'item', items: ['ancient_scroll'], gold: 0, msg: 'บนแท่นหินมีม้วนกระดาษเก่า... ฝุ่นหนามาก' } },
      { id: 'find_void_crystal',weight: 3,  result: { type: 'item', items: ['void_crystal'], gold: 0, msg: 'มุมมืดสุดของถ้ำมีก้อนสีดำทะมึน ไม่สะท้อนแสง...' } },
      { id: 'find_gold',        weight: 12, result: { type: 'gold', gold: [15, 40], msg: 'พบซากเป้ของนักผจญภัยที่ไม่โชคดี ยังมีทองเหลืออยู่บ้าง' } },
      { id: 'encounter',        weight: 30, result: { type: 'encounter', msg: 'ได้ยินเสียงหายใจในความมืด...' } },
      { id: 'nothing_1',        weight: 5,  result: { type: 'nothing', msg: 'ทางตันอีกแล้ว ผนังหิน ไม่มีอะไรต่างออกไป' } },
      { id: 'nothing_2',        weight: 5,  result: { type: 'nothing', msg: 'ค้างคาวฝูงใหญ่บินออกจากรอยแยก แต่ไม่โจมตี' } },
    ],
  },

  city_ruins: {
    zoneId: 'city_ruins',
    name: 'Ashenveil City Ruins', nameTH: 'ซากเมือง Ashenveil',
    shard: 'midgame', level: [10, 20],
    zoneBossId: 'ruins_boss',
    atmosphere: [
      'ตึกรามสูงใหญ่ที่เคยตระการตา บัดนี้ล้มทับกันเป็นซาก',
      'กลิ่นควันไฟเก่าที่ยังลอยอยู่ ราวกับเมืองเพิ่งถูกเผาไม่นานนี้',
      'น้ำพุกลางเมืองแตกร้าว น้ำสีดำไหลรดดินรอบๆ',
      'หุ่นเกราะหลายตัวล้มอยู่บนถนน หน้ากากกระจก เห็นความว่างข้างใน',
      'ธงสีแดงเก่าขาดปลิวอยู่บนยอดตึก เครื่องหมายอาณาจักรที่ล่มสลาย',
      'เสียงฝีเท้าดังมาจากตรอกข้างๆ แต่หันไปดูก็ไม่มีอะไร',
    ],
    canFight: true, canExplore: true,
    monsters: ['ruined_knight', 'plague_rat', 'city_ghoul', 'shadow_rogue', 'iron_golem_shard'],
    icon: '🏚️',
    minLevel: 10,
    connections: ['town_square', 'dark_cave', 'cursed_marshlands'],
    events: [
      { id: 'find_steel',    weight: 18, result: { type: 'item', items: ['steel_ingot'], gold: 0, msg: 'ในซากโรงตีเหล็ก พบแท่งเหล็กกล้าที่ยังใช้ได้อยู่' } },
      { id: 'find_loot',     weight: 12, result: { type: 'gold', gold: [40, 100], msg: 'ตู้เซฟเก่าในอาคารร้าง ถูกทิ้งไว้ แต่ยังมีทองอยู่' } },
      { id: 'find_armor',    weight: 6,  result: { type: 'item', items: ['chainmail_fragment'], gold: 0, msg: 'พบชิ้นส่วนเกราะลูกโซ่ฝังอยู่ใต้เศษหิน' } },
      { id: 'find_scroll',   weight: 8,  result: { type: 'item', items: ['ancient_scroll'], gold: 0, msg: 'ห้องสมุดพังเกือบหมด แต่ยังพบม้วนกระดาษที่ยังดีอยู่' } },
      { id: 'find_void',     weight: 5,  result: { type: 'item', items: ['void_crystal'], gold: 0, msg: 'ในซากวัดเก่า มีคริสตัลสีดำวางอยู่บนแท่นบูชา' } },
      { id: 'find_shadow',   weight: 7,  result: { type: 'item', items: ['shadow_cloth'], gold: 0, msg: 'เศษผ้าสีดำที่ดูดซับแสงแขวนอยู่บนราวตากผ้าร้าง' } },
      { id: 'encounter',     weight: 35, result: { type: 'encounter', msg: 'เสียงก้าวหนักๆ ที่ไม่ควรจะยังเดินได้...' } },
      { id: 'nothing_1',     weight: 5,  result: { type: 'nothing', msg: 'แค่ซากอิฐ ซากหิน ความเงียบที่น่าเศร้า' } },
      { id: 'nothing_2',     weight: 4,  result: { type: 'nothing', msg: 'ภาพวาดบนผนังเกือบลบแล้ว เห็นแค่ดวงตา' } },
    ],
  },

  cursed_marshlands: {
    zoneId: 'cursed_marshlands',
    name: 'Cursed Marshlands', nameTH: 'หนองสาปแช่ง',
    shard: 'midgame', level: [18, 28],
    zoneBossId: 'marsh_boss',
    atmosphere: [
      'น้ำสีเขียวขุ่นไม่เห็นก้น หมอกลอยหนาทั้งกลางวันกลางคืน',
      'ต้นไม้บิดเบี้ยวทุกต้น ราวกับถูกสาปให้เติบโตผิดรูป',
      'ฟองอากาศผุดขึ้นจากโคลน เสียงดูดน่ากลัว',
      'กลิ่นกำมะถันและเนื้อเน่า คลื่นไส้แค่หายใจ',
      'แสงวาบสีเขียวในหมอก บางครั้งเห็นเงาเคลื่อนไหว',
      'เสียงร้องครางจากทุกทิศ ไม่รู้ว่าของสัตว์หรือมนุษย์',
    ],
    canFight: true, canExplore: true,
    monsters: ['bog_lurker', 'swamp_wraith', 'giant_leech', 'marsh_basilisk'],
    icon: '🌿',
    minLevel: 18,
    connections: ['city_ruins', 'void_frontier'],
    events: [
      { id: 'find_herb',    weight: 15, result: { type: 'item', items: ['bog_scale', 'antidote'], gold: 0, msg: 'ในหนองลึก พบพืชแปลกและเกล็ดสัตว์ที่ร่วงหล่นไว้' } },
      { id: 'find_essence', weight: 8,  result: { type: 'item', items: ['wraith_essence'], gold: 0, msg: 'หยดของเหลวสีม่วงลอยอยู่กลางอากาศ... ดึงดูดแปลกๆ' } },
      { id: 'find_gold',    weight: 12, result: { type: 'gold', gold: [80, 180], msg: 'กล่องโลหะจมอยู่ในโคลน ข้างในยังมีทองคำ' } },
      { id: 'find_crystal', weight: 10, result: { type: 'item', items: ['void_crystal', 'void_crystal'], gold: 0, msg: 'ผลึกสีดำขึ้นเป็นกลุ่มในน้ำสกปรก' } },
      { id: 'find_scroll',  weight: 6,  result: { type: 'item', items: ['ancient_scroll'], gold: 0, msg: 'กระเป๋าของนักผจญภัยคนก่อนลอยอยู่ในหนอง' } },
      { id: 'find_poison',  weight: 8,  result: { type: 'item', items: ['poison_vial'], gold: 0, msg: 'ขวดพิษสกัดจากสิ่งมีชีวิตในหนอง ใช้ประโยชน์ได้' } },
      { id: 'encounter',    weight: 32, result: { type: 'encounter', msg: 'บางอย่างโผล่ขึ้นจากโคลนใต้เท้า...' } },
      { id: 'nothing_1',    weight: 5,  result: { type: 'nothing', msg: 'จมลงในโคลนถึงเข่า ต้องดึงตัวเองออกมาอย่างยาก' } },
      { id: 'nothing_2',    weight: 4,  result: { type: 'nothing', msg: 'หมอกหนาขึ้น หลงทางสักพักแล้วกลับมาจุดเดิม' } },
    ],
  },

  void_frontier: {
    zoneId: 'void_frontier',
    name: 'Void Frontier', nameTH: 'ชายขอบ Void',
    shard: 'endgame', level: [28, 50],
    zoneBossId: 'void_boss',
    atmosphere: [
      'ท้องฟ้าสีดำไม่มีดาว พื้นดินแตกร้าว มีแสงม่วงผุดขึ้นจากรอยแยก',
      'กฎฟิสิกส์ไม่ทำงานที่นี่ หินลอย น้ำไหลย้อนขึ้น',
      'เงาของคุณเคลื่อนไหวผิดทิศ บางครั้งเหมือนมันมีใจเป็นของตัวเอง',
      'เสียงกระซิบจากทุกมุม ไม่เป็นภาษาที่รู้จัก แต่เข้าใจได้',
      'ดาวในท้องฟ้าขยับ จัดตัวเป็นรูปแบบที่คุ้นเคยแต่นึกไม่ออก',
      'เวลาดูเหมือนช้าลง ทุกก้าวใช้พลังงานมากกว่าปกติ',
    ],
    canFight: true, canExplore: true,
    monsters: ['void_stalker', 'soul_harvester', 'void_titan', 'chaos_elemental'],
    icon: '🌀',
    minLevel: 28,
    connections: ['cursed_marshlands'],
    events: [
      { id: 'find_void_cache', weight: 15, result: { type: 'item', items: ['void_crystal', 'void_crystal', 'void_crystal'], gold: 0, msg: 'รอยแยกในอวกาศ ด้านในมีคริสตัลจาก Void กองอยู่' } },
      { id: 'find_essence',    weight: 12, result: { type: 'item', items: ['void_essence', 'void_essence'], gold: 0, msg: 'หยดพลังงานบริสุทธิ์จาก The Void ลอยนิ่งอยู่' } },
      { id: 'find_soul_gem',   weight: 6,  result: { type: 'item', items: ['soul_gem'], gold: 0, msg: 'อัญมณีที่กักเก็บวิญญาณ สั่นสะเทือนเมื่อจับ' } },
      { id: 'find_gold',       weight: 10, result: { type: 'gold', gold: [200, 500], msg: 'กองทองคำลอยอยู่กลางอากาศ เหมือนใครทิ้งไว้' } },
      { id: 'find_chaos',      weight: 8,  result: { type: 'item', items: ['chaos_shard'], gold: 0, msg: 'เศษพลังงาน Chaos ที่แข็งตัวเป็นรูปร่าง' } },
      { id: 'find_scroll',     weight: 8,  result: { type: 'item', items: ['ancient_scroll', 'ancient_scroll'], gold: 0, msg: 'ม้วนหนังสือโบราณลอยอยู่ในอวกาศ เขียนด้วยภาษา Void' } },
      { id: 'encounter',       weight: 30, result: { type: 'encounter', msg: 'บางอย่างจาก The Void ตรวจพบว่าคุณอยู่ที่นี่...' } },
      { id: 'nothing_1',       weight: 6,  result: { type: 'nothing', msg: 'คุณก้าวเดินไปข้างหน้า แต่กลับมาอยู่จุดเดิม' } },
      { id: 'nothing_2',       weight: 5,  result: { type: 'nothing', msg: 'แสงวาบ แล้วก็ดับ ไม่มีอะไรเหลือ' } },
    ],
  },

  shadowfell_depths: {
    zoneId: 'shadowfell_depths',
    name: 'Shadowfell Depths', nameTH: 'ห้วงลึกแห่งเงา',
    shard: 'endgame', level: [38, 55],
    zoneBossId: 'shadow_boss',
    atmosphere: [
      'มิติเงาที่แยกออกมาจาก The Void ท้องฟ้าเป็นผิวกระจกสีดำสะท้อนเงาคุณกลับมา',
      'ทุกก้าวทิ้งรอยเงาไว้ข้างหลัง และรอยเงาเหล่านั้นเคลื่อนไหวต่อ',
      'เสียงกระซิบจากเงาของตัวเอง บางครั้งมันพูดสิ่งที่คุณยังไม่รู้',
      'ดวงอาทิตย์ที่นี่เป็นสีดำ แสดงออกมาเป็นความมืดที่มองเห็นได้',
      'ร่างเงาของคนที่เคยมาที่นี่เดินเวียนซ้ำๆ ไม่รู้ตัวว่าตายแล้ว',
      'สิ่งที่ตายที่นี่ไม่ได้หายไป — มันกลายเป็นส่วนหนึ่งของความมืด',
    ],
    canFight: true, canExplore: true,
    monsters: ['shadow_wraith', 'dark_knight', 'nightmare_hound'],
    icon: '🌑',
    minLevel: 38,
    connections: ['void_frontier', 'vorath_citadel'],
    events: [
      { id: 'find_shadow_gem',  weight: 12, result: { type: 'item', items: ['soul_gem'], gold: 0, msg: 'เงาของคุณทิ้งอัญมณีวิญญาณไว้ คุณหยิบมันขึ้นมา' } },
      { id: 'find_void_cache',  weight: 15, result: { type: 'item', items: ['void_crystal', 'void_essence'], gold: 0, msg: 'รอยแยกในเงา เป็นทางเข้าไปในห้องเล็กที่เต็มไปด้วยผลึก' } },
      { id: 'find_dark_steel',  weight: 10, result: { type: 'item', items: ['dark_steel'], gold: 0, msg: 'โลหะสีดำที่หลอมจากเงาแข็ง ของหายากในมิตินี้' } },
      { id: 'find_chaos',       weight: 8,  result: { type: 'item', items: ['chaos_shard'], gold: 0, msg: 'เศษพลังงานที่ไม่เป็นระเบียบ สั่นสะเทือนในมือ' } },
      { id: 'find_gold',        weight: 10, result: { type: 'gold', gold: [300, 700], msg: 'ทองคำจากมิติอื่นลอยอยู่ มูลค่าเดิมในโลกของคุณ' } },
      { id: 'find_scroll',      weight: 8,  result: { type: 'item', items: ['ancient_scroll', 'ancient_scroll'], gold: 0, msg: 'ม้วนหนังสือเขียนด้วยภาษาเงา แปลได้บ้าง บ้างก็ไม่ได้' } },
      { id: 'encounter',        weight: 30, result: { type: 'encounter', msg: 'เงาของคุณแยกตัวออกมาและหันหน้ามาโจมตี...' } },
      { id: 'nothing_1',        weight: 4,  result: { type: 'nothing', msg: 'เดินในความมืดสักพัก ไม่พบอะไร นอกจากเงาของตัวเอง' } },
      { id: 'nothing_2',        weight: 3,  result: { type: 'nothing', msg: 'กระจกเงาขนาดใหญ่ แต่ภาพสะท้อนล้าช้ากว่า 5 วินาที' } },
    ],
  },

  vorath_citadel: {
    zoneId: 'vorath_citadel',
    name: "Vorath's Citadel", nameTH: 'ป้อมปราการ Vorath',
    shard: 'endgame', level: [50, 99],
    zoneBossId: 'vorath_boss',
    atmosphere: [
      'ป้อมปราการลอยอยู่กลางอวกาศ Void — ทำจากหินที่ดูดซับแสงทุกชนิด',
      'พื้นโปร่งใส มองลงไปเห็นดาวนับไม่ถ้วนที่กำลังดับลงทีละดวง',
      'เสียงของ Vorath ดังก้องในหัว ภาษาที่ไม่มีคำ แต่ความหมายชัดเจน',
      'ผู้พิทักษ์ Golem ยืนนิ่งทุก 10 เมตร จ้องมาที่คุณแต่ไม่โจมตีก่อน',
      'หน้าต่างเปิดไปสู่ The Sundering — เห็นโลกก่อนที่มันจะแตกสลาย',
      'ทางเดินหินแคบ ทั้งสองข้างคือความว่างเปล่าที่ไม่มีที่สิ้นสุด',
    ],
    canFight: true, canExplore: true,
    monsters: ['citadel_sentinel', 'void_priest', 'abyssal_dragon'],
    icon: '🏰',
    minLevel: 50,
    connections: ['shadowfell_depths'],
    events: [
      { id: 'find_titan_core',  weight: 8,  result: { type: 'item', items: ['titan_core'], gold: 0, msg: 'แกนพลังงานของ Golem ที่ถูกทำลาย ยังคงมีพลังหลงเหลือ' } },
      { id: 'find_void_hoard',  weight: 12, result: { type: 'item', items: ['void_crystal', 'void_crystal', 'void_essence'], gold: 0, msg: 'คลังของ Vorath ที่ถูกทิ้งร้าง ยังมีทรัพยากร Void เหลือ' } },
      { id: 'find_chaos_cache', weight: 10, result: { type: 'item', items: ['chaos_shard', 'chaos_shard'], gold: 0, msg: 'ห้องทดลองของ Vorath มีเศษพลังงาน Chaos กองอยู่' } },
      { id: 'find_soul_trove',  weight: 8,  result: { type: 'item', items: ['soul_gem', 'soul_gem'], gold: 0, msg: 'วิญญาณของนักผจญภัยที่ล้มเหลวถูกขังไว้ในอัญมณี' } },
      { id: 'find_gold',        weight: 10, result: { type: 'gold', gold: [800, 2000], msg: 'คลังทองคำเก่าที่ Vorath เก็บสะสมจากอาณาจักรที่ล่มสลาย' } },
      { id: 'find_scroll',      weight: 10, result: { type: 'item', items: ['ancient_scroll', 'ancient_scroll', 'ancient_scroll'], gold: 0, msg: 'ห้องสมุด Void — ม้วนหนังสือที่รวบรวมความรู้จากหลายโลก' } },
      { id: 'encounter',        weight: 30, result: { type: 'encounter', msg: 'ผู้พิทักษ์ของ Vorath ตรวจพบผู้บุกรุก...' } },
      { id: 'nothing_1',        weight: 6,  result: { type: 'nothing', msg: 'ห้องว่างเปล่า บนผนังมีแค่ดวงตาที่วาดไว้นับร้อยดวง' } },
      { id: 'nothing_2',        weight: 6,  result: { type: 'nothing', msg: 'ทางตัน ประตูหินปิดสนิท ไม่มีทางเปิด ยังไม่ถึงเวลา' } },
    ],
  },

};

// NPC Shop inventory
const SHOP_INVENTORY = {
  starter: [
    { itemId: 'health_potion_small', stock: 99 },
    { itemId: 'health_potion_medium', stock: 50 },
    { itemId: 'mp_potion_small', stock: 99 },
    { itemId: 'antidote', stock: 50 },
    { itemId: 'bread', stock: 99 },
    { itemId: 'black_stone_weapon', stock: 30 },
    { itemId: 'black_stone_armor', stock: 30 },
    { itemId: 'leather_cap', stock: 5 },
    { itemId: 'leather_chest', stock: 5 },
    { itemId: 'leather_gloves', stock: 5 },
    { itemId: 'leather_legs', stock: 5 },
    { itemId: 'leather_boots', stock: 5 },
    { itemId: 'wooden_shield', stock: 5 },
    // midgame
    { itemId: 'health_potion_large', stock: 30 },
    { itemId: 'mp_potion_medium', stock: 30 },
    { itemId: 'elixir_stamina', stock: 20 },
    { itemId: 'chainmail_chest', stock: 3 },
    { itemId: 'steel_sword', stock: 3 },
  ],
};

function getZone(zoneId) { return ZONES[zoneId] || null; }

function getExploreEvent(zoneId) {
  const zone = ZONES[zoneId];
  if (!zone || !zone.events) return null;
  const totalWeight = zone.events.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of zone.events) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return zone.events[zone.events.length - 1];
}

// Zone display list for travel screen
const ZONE_LIST = [
  { id: 'town_square',       name: '🏘️ Town Square',         lv: 'Safe',   minLevel: 1  },
  { id: 'town_outskirts',    name: '🌾 ชานเมือง',             lv: 'Lv.1+',  minLevel: 1,  bossId: 'outskirts_boss' },
  { id: 'forest_path',       name: '🌲 ทางป่า',               lv: 'Lv.3+',  minLevel: 3,  bossId: 'forest_boss'    },
  { id: 'dark_cave',         name: '🕳️ ถ้ำมืด',              lv: 'Lv.5+',  minLevel: 5,  bossId: 'cave_boss'      },
  { id: 'city_ruins',        name: '🏚️ ซากเมือง',            lv: 'Lv.10+', minLevel: 10, bossId: 'ruins_boss'     },
  { id: 'cursed_marshlands', name: '🌿 หนองสาปแช่ง',         lv: 'Lv.18+', minLevel: 18, bossId: 'marsh_boss'     },
  { id: 'void_frontier',     name: '🌀 ชายขอบ Void',          lv: 'Lv.28+', minLevel: 28, bossId: 'void_boss'      },
  { id: 'shadowfell_depths', name: '🌑 ห้วงลึกแห่งเงา',      lv: 'Lv.38+', minLevel: 38, bossId: 'shadow_boss'    },
  { id: 'vorath_citadel',    name: '🏰 ป้อมปราการ Vorath',    lv: 'Lv.50+', minLevel: 50, bossId: 'vorath_boss'    },
];

module.exports = { ZONES, ZONE_LIST, SHOP_INVENTORY, getZone, getExploreEvent };
