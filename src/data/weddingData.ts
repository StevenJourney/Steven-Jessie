export type CharacterId = 'dove' | 'couple';

export interface StallHighlight {
  zh: string;
  en: string;
}

export interface StallInfo {
  id: string;
  number: string;
  titleZh: string;
  titleEn: string;
  timeRange: string;
  zoneZh: string;
  zoneEn: string;
  xPercent: number;
  yPercent: number;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  summaryZh: string;
  summaryEn: string;
  highlights: StallHighlight[];
  tipZh: string;
  tipEn: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  tableNumber: string;
  score: number;
  character: CharacterId;
  updatedAt: string;
}

export const WEDDING_STALLS: StallInfo[] = [
  {
    id: '01',
    number: '01',
    titleZh: '签到区',
    titleEn: 'Sign-in Area',
    timeRange: '15:30 – 16:45',
    zoneZh: '北侧迎宾草坪',
    zoneEn: 'North Welcome Lawn',
    xPercent: 21,
    yPercent: 26,
    accentBg: '#F48A94',
    accentText: '#FFFFFF',
    accentBorder: '#E5717C',
    summaryZh:
      '迎宾木桌与花艺画架处迎候各位挚友。请在嘉宾签到簿写下祝福，并领取专属伴手礼与游园攻略卡。',
    summaryEn:
      'Stop by the welcome desk and floral easel to sign our keepsake guestbook, collect your wedding favors, and grab your garden pass.',
    highlights: [
      { zh: '手写拍立得嘉宾签到簿', en: 'Polaroid & handwritten guestbook' },
      { zh: 'S & J 定制游园指南与伴手礼', en: 'Curated wedding favors & guide card' },
      { zh: '领取代币体验戒指扭蛋机', en: 'Collect your gachapon token here' },
    ],
    tipZh: '建议 16:15 前完成签到，留出充足时间拍照与打卡各站小摊位！',
    tipEn: 'Arrive before 16:15 so you have plenty of time to explore all garden booths!',
  },
  {
    id: '02',
    number: '02',
    titleZh: '主仪式区',
    titleEn: 'Main Ceremony Area',
    timeRange: '16:45 – 17:30',
    zoneZh: '星光泳池花门前',
    zoneEn: 'Poolside Floral Arch',
    xPercent: 49,
    yPercent: 23,
    accentBg: '#E66E7C',
    accentText: '#FFFFFF',
    accentBorder: '#D15967',
    summaryZh:
      '澄澈泳池畔的粉白玫瑰拱门下，S & J 将在日落余晖与亲友见证中交换誓言与戒指。',
    summaryEn:
      'Beneath the lush pink-and-white floral arch by the shimmering pool, S & J will exchange vows at golden hour.',
    highlights: [
      { zh: '16:45 请亲友入座，第一排预留给双方家人', en: '16:45 Guest seating · Front row reserved for family' },
      { zh: '17:00 正式入场与交换誓言', en: '17:00 Processional & vow exchange' },
      { zh: '花瓣雨礼成合影', en: 'Rose petal toss & group portrait' },
    ],
    tipZh: '椅子下方放有手抛花瓣纸筒，听到司仪提示时一起撒向新人吧！',
    tipEn: 'Petal cones are tucked under your chair—get ready for the petal toss finale!',
  },
  {
    id: '03',
    number: '03',
    titleZh: '甜品区饮品区',
    titleEn: 'Dessert & Beverage Bar',
    timeRange: '15:30 – 18:30',
    zoneZh: '东侧原木花艺吧台',
    zoneEn: 'East Rustic Garden Bar',
    xPercent: 80,
    yPercent: 25,
    accentBg: '#E59A62',
    accentText: '#FFFFFF',
    accentBorder: '#D4864D',
    summaryZh:
      '鲜花簇拥的原木吧台全天供应手冲咖啡、定制无酒精特调鸡尾酒与法式茶歇甜点。',
    summaryEn:
      'Our flower-trimmed rustic wooden bar serves signature wedding mocktails, iced pour-over coffee, and French pastries.',
    highlights: [
      { zh: '特调「初见白桃气泡」&「仲夏接骨木」', en: 'White Peach Fizz & Elderflower Spritz mocktails' },
      { zh: '精品冷萃咖啡与伯爵红茶', en: 'Cold brew coffee & Earl Grey iced tea' },
      { zh: '覆盆子马卡龙、柠檬塔与可露丽', en: 'Raspberry macarons, lemon tarts & canelés' },
    ],
    tipZh: '推荐搭配「初见白桃气泡」与现烤可露丽，仪式前先垫垫肚子！',
    tipEn: 'Pair the White Peach Fizz with a warm canelé before the ceremony begins.',
  },
  {
    id: '04',
    number: '04',
    titleZh: 'DIY笔袋区',
    titleEn: 'DIY Pouch Booth',
    timeRange: '15:30 – 18:15',
    zoneZh: '西侧粉黄条纹天幕帐篷',
    zoneEn: 'West Pastel Canopy Tent',
    xPercent: 23,
    yPercent: 45,
    accentBg: '#E5B24C',
    accentText: '#FFFFFF',
    accentBorder: '#CE9B37',
    summaryZh:
      '粉黄相间的花园帐篷里备好了帆布笔袋、刺绣贴片与手绘颜料，亲手定制一份带回家的婚礼纪念。',
    summaryEn:
      'Step under our pastel yellow-and-pink canopy tent to customize your own canvas pouch with botanical patches and stamps.',
    highlights: [
      { zh: '挑选帆布笔袋或随身小收纳袋', en: 'Choose a linen pencil case or mini pouch' },
      { zh: '数十款花朵、猫咪与 S&J 字母刺绣烫贴', en: 'Botanical patches, charms & S & J monograms' },
      { zh: '现场热压定型，3 分钟即可带走', en: 'Quick heat-press finish ready in 3 minutes' },
    ],
    tipZh: '可将做好的笔袋带去「05 戒指扭蛋区」，把抽到的小礼物直接装进去！',
    tipEn: 'Tuck your surprise capsule gift from Booth 05 right inside your custom pouch!',
  },
  {
    id: '05',
    number: '05',
    titleZh: '戒指扭蛋区',
    titleEn: 'Ring Gachapon Area',
    timeRange: '15:30 – 18:30',
    zoneZh: '东侧草坪彩球区',
    zoneEn: 'East Lawn Capsule Corner',
    xPercent: 79,
    yPercent: 49,
    accentBg: '#68B4C9',
    accentText: '#FFFFFF',
    accentBorder: '#539DB3',
    summaryZh:
      '超吸睛的巨型粉蓝双色扭蛋机！投入签到时领取的幸运代币，转动旋钮抽取 S & J 准备的惊喜戒指与纪念徽章。',
    summaryEn:
      'Spin our giant pastel pink-and-blue gachapon machine with your welcome token for surprise keepsake rings and wedding pins.',
    highlights: [
      { zh: '每人凭签到代币可免费扭蛋 1 次', en: '1 complimentary spin with your welcome token' },
      { zh: '内含趣味造型戒指、花朵发夹与隐藏款礼券', en: 'Includes novelty rings, floral pins & secret prizes' },
      { zh: '抽到金色扭蛋可凭蛋壳到签到台兑换神秘礼', en: 'Golden capsule unlocks a bonus gift at Booth 01' },
    ],
    tipZh: '别忘了打开「婚礼小游戏」冲榜，高分榜首还有额外惊喜！',
    tipEn: 'Check the Wedding Game tab too—top leaderboard scores win an extra prize!',
  },
  {
    id: '06',
    number: '06',
    titleZh: '拍照区',
    titleEn: 'Photo Booth Area',
    timeRange: '15:30 – 20:30',
    zoneZh: '西南角花藤长椅',
    zoneEn: 'Southwest Floral Bench',
    xPercent: 21,
    yPercent: 73,
    accentBg: '#6FA37A',
    accentText: '#FFFFFF',
    accentBorder: '#598D64',
    summaryZh:
      '繁花缠绕的木质长椅搭配复古三脚架相机与趣味手持牌，拍下一张即印即得的拍立得留念吧。',
    summaryEn:
      'Pose at the floral-draped garden bench with our vintage tripod camera and playful props for instant Polaroid prints.',
    highlights: [
      { zh: '复古拍立得相机 + 趣味手举牌道具', en: 'Instant Polaroid prints & whimsical photo props' },
      { zh: '可印两张：一张留作纪念，一张贴入签到相册', en: 'Snap two—keep one & pin one to the memory board' },
      { zh: '傍晚串灯亮起后拍照光线格外温柔浪漫', en: 'Fairy lights make twilight portraits extra dreamy' },
    ],
    tipZh: '拍照时记得使用 #SJGarden2026 分享你的花园瞬间！',
    tipEn: 'Share your favorite Polaroid moments with #SJGarden2026!',
  },
  {
    id: '07',
    number: '07',
    titleZh: '晚宴区',
    titleEn: 'Banquet / Dinner Area',
    timeRange: '18:30 – 21:00',
    zoneZh: '中央星光长桌草坪',
    zoneEn: 'Central Candlelit Lawn',
    xPercent: 52,
    yPercent: 78,
    accentBg: '#C89250',
    accentText: '#FFFFFF',
    accentBorder: '#B17D3E',
    summaryZh:
      '铺着纯白亚麻桌布的长桌点缀着金色烛台与鲜花，夜幕降临时我们将在串灯星空下举杯共进晚宴。',
    summaryEn:
      'Dine beneath twinkling fairy lights at our white-draped candlelit banquet tables surrounded by garden florals.',
    highlights: [
      { zh: '18:15 核对桌牌入席，18:30 晚宴正式开席', en: '18:15 Find your seat · 18:30 Dinner service starts' },
      { zh: '五道式花园西式晚宴（含素食菜单可选）', en: '5-course garden dinner (vegetarian option noted)' },
      { zh: '19:45 婚礼游戏颁奖 & 第一支舞', en: '19:45 Mini-game prize reveal & first dance' },
    ],
    tipZh: '候餐时间快来玩「Flappy Love」冲刺排行榜，奖品将在 19:45 颁发！',
    tipEn: 'Play Flappy Love while waiting for dinner—prizes awarded at 19:45!',
  },
  {
    id: '08',
    number: '08',
    titleZh: '冰淇淋区',
    titleEn: 'Ice Cream Cart',
    timeRange: '16:00 – 20:00',
    zoneZh: '东南角花园小推车',
    zoneEn: 'Southeast Garden Cart',
    xPercent: 82,
    yPercent: 75,
    accentBg: '#EC85A2',
    accentText: '#FFFFFF',
    accentBorder: '#D66D8A',
    summaryZh:
      '明黄色遮阳伞下的粉色鲜花冰淇淋小推车，为你盛上每日现做的手工意式 Gelato，甜度刚刚好。',
    summaryEn:
      'Look for the pink floral cart under the sunny yellow umbrella serving handcrafted Italian gelato scoops.',
    highlights: [
      { zh: '海盐开心果 · Sicilian Pistachio', en: 'Sicilian Sea-Salt Pistachio' },
      { zh: '大马士革玫瑰荔枝 · Rose Lychee', en: 'Damask Rose & Lychee Sorbet' },
      { zh: '马达加斯加香草豆 · Vanilla Bean', en: 'Madagascar Vanilla Bean & Crispy Cone' },
    ],
    tipZh: '可免费叠加两球口味，别忘了试试隐藏组合「玫瑰荔枝 + 开心果」！',
    tipEn: 'Ask for a double scoop—Rose Lychee + Pistachio is the couple’s favorite!',
  },
];
