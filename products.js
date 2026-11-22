/* =========================================================
   NexEra Skin: the product range.
   Edit the lists in RANGE to add or remove products.
   Names come from the owner's product list (South African market).
   Everything else (type and ingredient chips) is worked out from the name
   below, so nothing here is a claim the name does not make.
   Every product has a real photo: assets/cutouts/<id>.webp (see NOTES.md).
   ========================================================= */
(function (global) {
  'use strict';

  var EMAIL = 'nexeracommerce@gmail.com';

  var BRANDS = [
        { id: 'garnier', name: 'Garnier' },
    { id: 'cerave', name: 'CeraVe' },
    { id: 'eucerin', name: 'Eucerin' },
    { id: 'avene', name: 'Avène' }
  ];

  /* The types visitors can filter by, and which routine step each belongs to. */
  var TYPES = [
        { id: 'cleanser', name: 'Cleansers', one: 'Cleanser', step: 'cleanse',
      what: 'Cleansers lift away oil, dirt, sunscreen and make-up, so skin is clean before the next step.' },
    { id: 'water', name: 'Waters and toners', one: 'Water or toner', step: 'cleanse',
      what: 'Light waters and toners refresh the skin or take off make-up without rinsing.' },
    { id: 'exfoliant', name: 'Exfoliators and treatments', one: 'Exfoliator or treatment', step: 'cleanse',
      what: 'Used now and then, these clear away dead skin cells or target a single spot.' },
    { id: 'serum', name: 'Serums', one: 'Serum', step: 'treat',
      what: 'Serums are light, concentrated formulas used after cleansing and before moisturiser.' },
    { id: 'moisturiser', name: 'Moisturisers', one: 'Moisturiser', step: 'moisturise',
      what: 'Moisturisers help the skin hold on to water, so it feels soft and comfortable.' },
    { id: 'sunscreen', name: 'Sunscreens', one: 'Sunscreen', step: 'protect',
      what: 'Sunscreens filter the sun’s UV rays. They go on last in the morning and are reapplied during the day.' },
    { id: 'body', name: 'Body care', one: 'Body care', step: 'moisturise',
      what: 'Moisture for arms, legs, hands and feet, in lotions and creams made for the body.' },
    { id: 'repair', name: 'Repair and balms', one: 'Repair cream or balm', step: 'moisturise',
      what: 'Richer creams, balms and ointments for very dry, rough or uncomfortable areas.' },
    { id: 'eyelip', name: 'Eye and lip', one: 'Eye or lip care', step: 'moisturise',
      what: 'Small formats made for the thinner skin around the eyes or on the lips.' }
  ];

  /* Brand colours for the scroll story, cards and 3D view (bg, accent, ingredient bubbles). */
  var THEME = {
    cerave: { bg: '#eaf1f8', accent: '#1f5fa8', ingredient: '#a9c9ee' },
    garnier: { bg: '#fff1e0', accent: '#e06a00', ingredient: '#ffc46b' },
    eucerin: { bg: '#fbecee', accent: '#b0213c', ingredient: '#f2b3bf' },
    avene: { bg: '#e4f4f2', accent: '#138a87', ingredient: '#9fd9d3' }
  };

  /* The routine steps, used by the cover, the skin story and the 3D view. */
  var STEPS = [
        { id: 'cleanse', n: '01', name: 'Cleanse' },
    { id: 'treat', n: '02', name: 'Treat' },
    { id: 'moisturise', n: '03', name: 'Moisturise' },
    { id: 'protect', n: '04', name: 'Protect' }
  ];

  /* The owner's list, by brand and type. */
  var RANGE = {
    garnier: {
      cleanser: [
        'Even & Bright Vitamin C Serum Cleanser', 'Even & Bright Vitamin C Cleansing Foam', 'Even & Matte Vitamin C Cleansing Gel', 'Pure Active Daily Deep Pore Wash', 'Pure Active 3-in-1 Clay Cleanser', 'Pure Active Charcoal 3-in-1'
      ],
      water: ['Micellar Cleansing Water'],
      moisturiser: ['Even & Bright Vitamin C Water Gel', 'Even & Bright Vitamin C Cream for Very Oily Skin'],
      serum: ['Even & Bright 3.5% Vitamin C Day Booster Serum', 'Pure Active AHA+BHA Charcoal Anti-Blemish Serum', 'Even & Bright Vitamin C Dark Spot Corrector'
      ],
      sunscreen: ['Super UV Invisible Serum Sunscreen Vitamin C', 'Even & Bright Vitamin C Protection Day Cream SPF30'
      ],
      exfoliant: ['Even & Bright Vitamin C Gentle Clarifying Face Scrub']
    },
    cerave: {
      cleanser: [
        'Hydrating Cleanser', 'Foaming Cleanser', 'Hydrating Cream-to-Foam Cleanser', 'SA Smoothing Cleanser',
        'Blemish Control Cleanser', 'Hydrating Foaming Oil Cleanser'
      ],
      moisturiser: [
        'Moisturising Cream', 'Moisturising Lotion', 'Facial Moisturising Lotion PM',
        'Oil Control Moisturising Gel-Cream', 'Intensive Moisturising Cream', 'SA Smoothing Cream'],
      serum: ['Skin Renewing Vitamin C Serum', 'Resurfacing Retinol Serum', 'Hydrating Hyaluronic Acid Serum'],
      sunscreen: ['Facial Moisturising Lotion SPF30', 'Facial Moisturising Lotion SPF50'],
      repair: ['Advanced Repair Ointment'],
      eyelip: ['Eye Repair Cream']
    },
    eucerin: {
      cleanser: ['DermatoCLEAN Refreshing Cleansing Gel'
      ],
      water: ['DermoPure Toner'],
      moisturiser: [
        'DermoPure Hydra Repair', 'DermoPure Clinical Mattifying Fluid', 'Hyaluron-Filler Day Cream', 'Hyaluron-Filler Night Cream',
        'Hyaluron-Filler + Elasticity Day Cream', 'Hyaluron-Filler + Elasticity Night Cream', 'Original Extra Thick Creme'
      ],
      serum: ['Even Pigment Perfector Dual Serum', 'Anti-Pigment Spot Corrector'
      ],
      sunscreen: [
        'Sun Face Oil Control Gel-Cream SPF50+', 'Sun Face Hydro Protect SPF50+', 'Sun Face Photoaging Control SPF50+',
        'Sun Body Gel-Cream Dry Touch', 'Sun Sensitive Protect'
      ],
      body: [
        'pH5 Soft Body Cream', 'UreaRepair PLUS 10% Urea Lotion',
        'UreaRepair PLUS 5% Urea Hand Cream'],
      repair: ['Aquaphor Soothing Skin Balm']
    },
    avene: {
      cleanser: [
        'Cleanance Cleansing Gel', 'Tolerance Extremely Gentle Cleanser'],
      water: ['Cleanance Micellar Water', 'Thermal Spring Water'],
      moisturiser: [
        'Hydrance Light Hydrating Emulsion', 'Hydrance Rich Hydrating Cream', 'Hydrance Aqua-Gel', 'Tolerance Control Soothing Skin Recovery Cream', 'Hyaluron Activ B3 Cellular Renewal Cream'],
      serum: [
        'Hyaluron Activ B3 Serum', 'Cicalfate+ Intensive Recovery Serum', 'Vitamin Activ Cg Serum', 'Cleanance Comedomed'
      ],
      repair: [
        'Cicalfate+ Restorative Protective Cream', 'XeraCalm A.D Lipid-Replenishing Balm', 'XeraCalm A.D Lipid-Replenishing Cream',
        'Tolerance Control Soothing Skin Recovery Balm'
      ],
      sunscreen: [
        'Hydrance SPF30 Hydrating Cream', 'Very High Protection Cream SPF50+', 'Intense Protect SPF50+', 'Mineral Sunscreen SPF50+'],
      eyelip: ['Cicalfate+ Lips']
    }
  };
  /* Sell tier from the owner's list (skincare_products.json, "sell_tier").
     stock: featured and sold. maybe: listed in the shop only, never featured.
     Everything in RANGE that is not listed here is stock.
     skip: not on the site (removed from RANGE). */
  var MAYBE = {
    garnier: ['Even & Bright Vitamin C Serum Cleanser', 'Pure Active Daily Deep Pore Wash', 'Pure Active 3-in-1 Clay Cleanser',
      'Even & Bright Vitamin C Cream for Very Oily Skin', 'Pure Active AHA+BHA Charcoal Anti-Blemish Serum', 'Even & Bright Vitamin C Gentle Clarifying Face Scrub'],
    cerave: ['Hydrating Cream-to-Foam Cleanser', 'Hydrating Foaming Oil Cleanser', 'Intensive Moisturising Cream', 'Oil Control Moisturising Gel-Cream',
      'Skin Renewing Vitamin C Serum', 'Hydrating Hyaluronic Acid Serum', 'Facial Moisturising Lotion SPF50', 'Eye Repair Cream'],
    eucerin: ['DermoPure Toner', 'DermoPure Hydra Repair', 'DermoPure Clinical Mattifying Fluid', 'Hyaluron-Filler + Elasticity Day Cream',
      'Hyaluron-Filler + Elasticity Night Cream', 'Anti-Pigment Spot Corrector', 'Sun Face Hydro Protect SPF50+', 'Sun Face Photoaging Control SPF50+',
      'Sun Body Gel-Cream Dry Touch', 'Sun Sensitive Protect'],
    avene: ['Tolerance Extremely Gentle Cleanser', 'Cleanance Micellar Water', 'Hydrance Light Hydrating Emulsion', 'Hydrance Rich Hydrating Cream',
      'Tolerance Control Soothing Skin Recovery Cream', 'Hyaluron Activ B3 Cellular Renewal Cream', 'Hyaluron Activ B3 Serum',
      'Cicalfate+ Intensive Recovery Serum', 'Vitamin Activ Cg Serum', 'Cleanance Comedomed', 'XeraCalm A.D Lipid-Replenishing Cream',
      'Tolerance Control Soothing Skin Recovery Balm', 'Hydrance SPF30 Hydrating Cream', 'Very High Protection Cream SPF50+', 'Mineral Sunscreen SPF50+']
  };

  /* The four products the cover and the scroll story feature, one per step. Stock only.
     Garnier's "Vitamin C Booster Serum" (stock) is the same serum as the
     Even & Bright 3.5% Vitamin C Day Booster Serum; only the current name has a photo. */
  var FEATURED = [
    'cerave-hydrating-cleanser',
    'garnier-even-and-bright-3-5-vitamin-c-day-booster-serum',
    'avene-hydrance-aqua-gel',
    'eucerin-sun-face-oil-control-gel-cream-spf50-plus'
  ];

  /* Removed on 2026-11-22 (owner's request): products with no real product photo,
     most of them old names or not sold in South Africa. See images/report.md.
     "Even & Matte Vitamin C Face Scrub" is listed under its current name,
     Even & Bright Vitamin C Gentle Clarifying Face Scrub (Garnier renamed the range).
     Merged from the owner's list (same product listed twice):
     Garnier "Pure Active 3-in-1 Clay" = "Pure Active 3-in-1 Clay Cleanser";
     CeraVe "SA Smoothing Cream", "Moisturising Cream", "Moisturising Lotion" (also under body care);
     Avène "Cicalfate+ Repairing Protective Cream" = "Cicalfate+ Restorative Protective Cream";
     Avène "Tolérance Soothing Skin Recovery Balm" = "Tolerance Control Soothing Skin Recovery Balm".
     Removed on 2026-11-22 (owner's sell tiers): the 21 products marked skip. */

  /* Ranges (product lines) recognised at the start of a name. */
  var RANGES = {
    garnier: ['Even & Bright', 'Even & Matte', 'Pure Active', 'Super UV', 'Micellar', 'Purifying Micellar'],
    cerave: ['SA Smoothing', 'Skin Renewing'],
    eucerin: ['DermoPure', 'DermatoCLEAN', 'Hyaluron-Filler', 'Even Pigment Perfector', 'Anti-Pigment', 'Sun', 'pH5', 'UreaRepair PLUS', 'Aquaphor', 'Original'],
    avene: ['Cleanance', 'Tolerance', 'XeraCalm', 'Hydrance', 'Hyaluron Activ B3', 'Cicalfate+', 'Vitamin Activ Cg', 'A-Oxitive', 'Antirougeurs', 'Very High Protection', 'Intense Protect']
  };

  /* Chips: only what the product name itself says. */
  var CHIPS = [
        [/\b3\.5% Vitamin C\b/, '3.5% Vitamin C'],
    [/\bVitamin C\b|\bActiv Cg\b/, 'Vitamin C'],
    [/\bHyaluron(ic)?\b|Hyaluron-/, 'Hyaluronic acid'],
    [/\bSalicylic\b/, 'Salicylic acid'],
    [/AHA\+BHA/, 'AHA + BHA'],
    [/\bRetinol\b/, 'Retinol'],
    [/\bB3\b/, 'Vitamin B3'],
    [/\b10% Urea\b/, 'Urea 10%'],
    [/\b5% Urea\b/, 'Urea 5%'],
    [/\bPeptide\b/, 'Peptides'],
    [/\bCharcoal\b/, 'Charcoal'],
    [/\bClay\b/, 'Clay'],
    [/\bMineral\b/, 'Mineral filters'],
    [/\bMicellar\b/, 'Micellar'],
    [/\bThermal Spring Water\b/, 'Thermal spring water'],
    [/\bNight\b|\bPM\b/, 'Night'],
    [/\bDay\b/, 'Day']
  ];

  function slug(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\+/g, ' plus ').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  var typeById = {}, brandById = {};
  TYPES.forEach(function (t) { typeById[t.id] = t; });
  BRANDS.forEach(function (b) { brandById[b.id] = b; });

  var PRODUCTS = [], seen = {};
  BRANDS.forEach(function (b) {
    var byType = RANGE[b.id];
    Object.keys(byType).forEach(function (typeId) {
      byType[typeId].forEach(function (name) {
        var id = b.id + '-' + slug(name);
        if (seen[id]) return;
        seen[id] = true;
        var t = typeById[typeId];
        var range = null;
        (RANGES[b.id] || []).forEach(function (r) { if (!range && name.indexOf(r) === 0) range = r; });
        var chips = [];
        CHIPS.forEach(function (c) {
          if (chips.length < 2 && c[0].test(name) && chips.indexOf(c[1]) < 0 && !(c[1] === 'Vitamin C' && chips.indexOf('3.5% Vitamin C') >= 0)) chips.push(c[1]);
        });
        var spf = (name.match(/SPF\s?(\d+\+?)/) || [])[1];
        if (spf) chips.unshift('SPF ' + spf);
        PRODUCTS.push({
          id: id, brand: b.id, brandName: b.name, name: name, type: typeId, typeName: t.one, step: t.step,
          range: range, chips: chips.slice(0, 2), tier: (MAYBE[b.id] || []).indexOf(name) >= 0 ? 'maybe' : 'stock',
          img: 'assets/cutouts/' + id + '.webp', thumb: 'assets/cutouts/sm/' + id + '.webp'
        });
      });
    });
  });

  /* The shop shows stock first, then maybe (each keeps the brand and type order). */
  PRODUCTS = PRODUCTS.filter(function (p) { return p.tier === 'stock'; }).concat(PRODUCTS.filter(function (p) { return p.tier === 'maybe'; }));
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });
  var featured = FEATURED.map(function (id) { return byId[id]; }).filter(function (p) { return p && p.tier === 'stock'; });

  global.NEXERA_SKIN = { EMAIL: EMAIL, BRANDS: BRANDS, TYPES: TYPES, STEPS: STEPS, THEME: THEME, PRODUCTS: PRODUCTS, FEATURED: featured, typeById: typeById, brandById: brandById, byId: byId };
})(typeof window !== 'undefined' ? window : globalThis);
