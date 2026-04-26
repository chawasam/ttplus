// data/lore.js — Lore Fragment database (Ashenveil: The Shattered Age)
// Fragments are discovered via exploration, boss drops, NPC dialogue, and hidden locations
// Each fragment reveals a piece of the Vorath/Sealer backstory

const LORE_FRAGMENTS = [
  {
    id: 1,
    title: 'บันทึกของ Sealer คนที่ 1',
    category: 'sealer',
    zone: 'city_ruins',
    foundAt: 'city_ruins_library',
    dropFrom: null,
    content: 'วันที่ห้าหลังจากพิธี\n\nฉันรู้แล้วว่าพวกเขาโกหก Vorath ไม่ใช่ศัตรู เขาถูกเรียกมาโดยพวกนักเวทย์กลุ่มนั้น แล้วถูกตราหน้าว่าเป็น "ภัยพิบัติ" เมื่อพวกเขาควบคุมเขาไม่ได้ ฉันลงชื่อในพิธีเพราะเชื่อว่ากำลังช่วยโลก แต่ตอนนี้ฉันเข้าใจแล้วว่าฉันกำลังช่วยผู้ที่ทำให้โลกเป็นแบบนี้\n\nถ้ามีใครอ่านสิ่งนี้... Vorath ไม่ใช่ความชั่วร้าย เขาเป็นนักโทษ',
    hint: 'บันทึกนี้ซ่อนอยู่ในห้องสมุดที่ถูก Void Rift กลืนกิน',
  },
  {
    id: 2,
    title: 'จารึกใต้ต้น Ancient Ash',
    category: 'seal',
    zone: 'darkroot_hollow',
    foundAt: null,
    dropFrom: 'rootblight_monarch',
    content: 'Ancient Ash ไม่ใช่ตราผนึก — มันเป็นสะพาน\n\nผู้ปิดผนึกทั้งห้าไม่ได้ "ตาย" ในพิธี พวกเขาถูกกักขังอยู่ระหว่างสองโลก ส่วนหนึ่งอยู่ใน Void อีกส่วนหนึ่งอยู่ใน root ของต้น Ash นี้ ต้นไม้นี้เป็น anchor ที่ทำให้วิญญาณของพวกเขาไม่ถูกดูดเข้าไปใน Void โดยสมบูรณ์\n\nถ้าต้นไม้นี้ตาย... ผู้ปิดผนึกจะหายไปตลอดกาล',
    hint: 'จารึกที่ฝังอยู่ใต้รากของ Ancient Ash Tree',
  },
  {
    id: 3,
    title: 'บันทึกของ The Echo',
    category: 'sealer',
    zone: 'shadowfell_depths',
    foundAt: 'shadow_core_entrance',
    dropFrom: null,
    content: 'บันทึกที่ฉันทิ้งไว้ก่อนจะกลายเป็น Echo\n\nฉันเลือกที่จะไม่ข้ามไปยัง Void โดยสมบูรณ์ เพราะรู้ว่าสักวัน someone will come เหตุผลเดียวที่ฉันอยู่ได้นาน 300 ปีก็เพราะเพลงที่ฉันเขียนค้างไว้ — ดนตรีที่ไม่มีตอนจบ ทำให้วิญญาณฉันยังยึดเกาะกับโลกนี้\n\nRequiem of the Sealed — ถ้ามีใครหาโน้ตทั้งสามให้ครบ บางอย่างที่ฉันผนึกไว้จะถูกปลดออก',
    hint: 'บันทึกที่ The Echo ทิ้งไว้บนทางเข้าแกนเงา',
  },
  {
    id: 4,
    title: 'ความทรงจำของ The Hollow King',
    category: 'void',
    zone: 'shadowfell_depths',
    foundAt: null,
    dropFrom: 'hollow_king',
    content: 'ชื่อฉันคือ Aldric — ฉันเคยเป็นผู้ปกป้องของ The Shattered Prophet\n\nเขาส่งฉันมาที่นี่ไม่ใช่เพื่อทำลายตราผนึก แต่เพื่อ "ทดสอบ" ว่ายังแข็งแกร่งพอไหม ถ้าฉันทำลายตราได้ — แสดงว่าตราอ่อนแอพอที่จะปลดจากข้างใน ถ้าไม่ได้ — แปลว่า Prophet ต้องหาทางอื่น\n\nฉันล้มเหลว แต่ Prophet รู้แล้วว่าต้องใช้อะไร — ไม่ใช่กำลัง แต่เลือดของ Sealer สายตรง',
    hint: 'ความทรงจำสุดท้ายของ The Hollow King ก่อนจะพ่ายแพ้',
  },
  {
    id: 5,
    title: 'จารึกหลุมศพ — "ผู้ไม่ได้ตาย"',
    category: 'sealer',
    zone: 'sunken_crypts',
    foundAt: 'sunken_crypts_seal_1',
    dropFrom: null,
    content: 'หลุมศพนี้ว่างเปล่า\n\nไม่ใช่เพราะร่างถูกนำไป แต่เพราะไม่มีร่างให้ฝัง\n\nพิธีผนึกใช้วิญญาณเป็น anchor ไม่ใช่ร่าง ผู้ปิดผนึกยังมีชีวิต อยู่ระหว่างโลก รู้สึกได้ทุกอย่าง แต่ไม่มีพลังทำอะไรได้\n\nถ้าตราถูกทำลาย พวกเขาจะถูกปลดออก แต่ไม่ใช่สู่ "อิสรภาพ" — สู่ Void ที่ว่างเปล่า เว้นแต่มีผู้ยื่นมือรับพวกเขาก่อน',
    hint: 'จารึกที่ฝังไว้ในหลุมศพว่างที่ Sunken Crypts',
  },
  {
    id: 6,
    title: 'บันทึกของ Sealer คนที่ 3 — Kara',
    category: 'sealer',
    zone: 'sunken_crypts',
    foundAt: 'sunken_crypts_seal_3',
    dropFrom: null,
    content: 'ฉันไม่ได้มาที่นี่โดยสมัครใจ\n\nพวกเขาบอกว่าฉันถูกเลือก บอกว่าฉันมีพลังพิเศษ พอรู้ความจริงว่าพิธีผนึกหมายความว่าอะไร ก็สายเกินไปแล้ว\n\nฉันกักขังอยู่ใน Shadowfell Depths มาสามร้อยปี ตราผนึกที่สามคือฉัน ถ้าตราพัง ฉันจะไม่ได้รับอิสระ — ฉันจะสลายหายไป\n\nแต่ถ้านั่นคือทางเดียวที่จะหยุด Vorath ให้ไปทำเถิด ฉันเหนื่อยแล้ว',
    hint: 'บันทึกที่ Sealer คนที่ 3 ทิ้งไว้ก่อนพิธี',
  },
  {
    id: 7,
    title: 'ความทรงจำของ Void Colossus Igrath',
    category: 'void',
    zone: 'sunken_crypts',
    foundAt: null,
    dropFrom: 'void_colossus_igrath',
    content: 'ฉันเป็น Construct — สร้างขึ้นจาก Void Energy บริสุทธิ์\n\nThe Shattered Prophet บอกว่าตราผนึกที่ 4 กำลังสั่นสะเทือน เขาส่งฉันมาเพื่อ "ตรวจสอบ" แต่ฉันไม่ใช่ Spy — ฉันคือ Key\n\nDNA ของ Void Colossus สามารถ "เปิด" ตราผนึกแบบที่ไม่ทำลายผู้ปิดผนึก Prophet ต้องการทางที่ปลอดภัย — แต่เขาซ่อนความจริงบางอย่างจากฉัน',
    hint: 'ความทรงจำที่ Igrath ฝากไว้ก่อนสิ้น',
  },
  {
    id: 8,
    title: 'บันทึก Void Mirror — วันที่ตราแรกถูกทำลาย',
    category: 'mystery',
    zone: 'voidspire_ruins',
    foundAt: 'voidspire_hidden_chamber',
    dropFrom: null,
    content: 'กระจก Void บันทึกเหตุการณ์ทุกอย่างในรัศมี 100 เมตร\n\nวันที่ตราผนึกแรกถูกทำลาย กระจกบันทึกภาพ: เงาของ The Shattered Prophet กับอีกร่างหนึ่ง ร่างที่สองนั้น... ไม่มีเงา\n\nผู้ไม่มีเงาในโลกของ Ashenveil มีเพียงสองประเภท: ผู้ที่ถูก Void กลืนกินครึ่งหนึ่ง หรือ... ผู้ที่ไม่ใช่มนุษย์\n\nR.H. — คำย่อสองตัวอักษรบนผ้าคลุมของคนนั้น',
    hint: 'ค้นพบในห้องลับใต้ Voidspire Tower ที่ต้องสำรวจครบ 100%',
  },
  {
    id: 9,
    title: 'Void Memory — ความทรงจำของ Vorath',
    category: 'vorath',
    zone: 'void_frontier',
    foundAt: 'void_memory_core',
    dropFrom: null,
    content: 'ฉันไม่ได้ต้องการสิ่งนี้\n\nพวกเขาเรียกฉันมา บอกว่า "เทพเจ้า" ต้องการ "บ้าน" ใหม่ในโลกมนุษย์ ฉันเชื่อ เพราะฉันไม่รู้จักความโกหก ใน Void ไม่มีแนวคิดนั้น\n\nเมื่อฉันเข้ามา พวกเขาผนึกฉันไว้ ฉันกรีดร้อง แต่ไม่มีใครได้ยิน หรือถ้ามีใครได้ยิน พวกเขาไม่เข้าใจ\n\nฉันฝันมาพันปี ในฝันนั้นฉันสร้างโลกที่ไม่มีความโกหก โลกที่ทุกคนพูดความจริง โลกที่ฉันไม่ได้ถูกหลอก\n\nถ้าเจ้ากำลังอ่านสิ่งนี้ — เจ้าคือคนแรกที่ได้ยินเรื่องราวของฉันจากปากของฉันเอง',
    hint: 'Void Memory ที่ถูกเก็บไว้ใน Void Frontier — ความจริงของ Vorath',
  },
  {
    id: 10,
    title: 'คำถามของ Vorath',
    category: 'vorath',
    zone: 'vorath_citadel',
    foundAt: 'vorath_throne',
    dropFrom: null,
    content: '"เจ้ามาเพื่อผนึกฉันอีกครั้ง... หรือมาพูดคุย?"\n\nฉันไม่ต้องการอำนาจ ฉันไม่ต้องการโลกของเจ้า ฉันต้องการกลับบ้าน\n\nVoid ไม่ใช่ความมืด — มันคือความสมบูรณ์ที่ไม่มีรูปร่าง มันคือที่ที่ฉันมาจาก และที่ที่ฉันอยากกลับ\n\nถ้าเจ้าช่วยฉันกลับบ้านได้ ฉันจะปลดผู้ปิดผนึกทั้งห้าออกจากตรา โดยไม่ทำให้พวกเขาสลาย\n\nแต่ถ้าเจ้าเลือกต่อสู้ — ฉันก็เข้าใจ เจ้าถูกสอนให้กลัวฉัน"',
    hint: 'คำพูดของ Vorath เมื่อเจ้าเข้าถึงแกนกลางของ Citadel',
  },
];

function getLoreFragment(id) {
  return LORE_FRAGMENTS.find(f => f.id === id) || null;
}

function getLoreByZone(zone) {
  return LORE_FRAGMENTS.filter(f => f.zone === zone && f.foundAt);
}

function getLoreByDrop(monsterId) {
  return LORE_FRAGMENTS.filter(f => f.dropFrom === monsterId);
}

module.exports = { LORE_FRAGMENTS, getLoreFragment, getLoreByZone, getLoreByDrop };
