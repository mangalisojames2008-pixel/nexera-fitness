/* =========================================================
   NexEra Skin: the product range.
   Edit the lists in RANGE to add or remove products.
   Names come from the owner's product list (South African market).
   Everything else (type, packaging shape, ingredient chips) is worked out
   from the name below, so nothing here is a claim the name does not make.
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
        { id: 'cleanser', name: 'Cleansers', one: 'Cleanser', step: 'cleanse', tone: 'aqua',
      what: 'Cleansers lift away oil, dirt, sunscreen and make-up, so skin is clean before the next step.' },
    { id: 'water', name: 'Waters and toners', one: 'Water or toner', step: 'cleanse', tone: 'mist',
      what: 'Light waters and toners refresh the skin or take off make-up without rinsing.' },
    { id: 'exfoliant', name: 'Exfoliators and treatments', one: 'Exfoliator or treatment', step: 'cleanse', tone: 'clay',
      what: 'Used now and then, these clear away dead skin cells or target a single spot.' },
    { id: 'serum', name: 'Serums', one: 'Serum', step: 'treat', tone: 'amber',
      what: 'Serums are light, concentrated formulas used after cleansing and before moisturiser.' },
    { id: 'moisturiser', name: 'Moisturisers', one: 'Moisturiser', step: 'moisturise', tone: 'blush',
      what: 'Moisturisers help the skin hold on to water, so it feels soft and comfortable.' },
    { id: 'sunscreen', name: 'Sunscreens', one: 'Sunscreen', step: 'protect', tone: 'sun',
      what: 'Sunscreens filter the sun’s UV rays. They go on last in the morning and are reapplied during the day.' },
    { id: 'body', name: 'Body care', one: 'Body care', step: 'moisturise', tone: 'sky',
      what: 'Moisture for arms, legs, hands and feet, in lotions and creams made for the body.' },
    { id: 'repair', name: 'Repair and balms', one: 'Repair cream or balm', step: 'moisturise', tone: 'lilac',
      what: 'Richer creams, balms and ointments for very dry, rough or uncomfortable areas.' },
    { id: 'eyelip', name: 'Eye and lip', one: 'Eye or lip care', step: 'moisturise', tone: 'rose',
      what: 'Small formats made for the thinner skin around the eyes or on the lips.' }
  ];

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
        'Even & Bright Vitamin C Serum Cleanser', 'Even & Bright Vitamin C Cleansing Foam', 'Even & Matte Vitamin C Cleansing Gel', 'Pure Active Deep Hydrating Cleanser', 'Pure Active Daily Deep Pore Wash', 'Pure Active 3-in-1 Clay Cleanser', 'Pure Active Charcoal 3-in-1'
      ],
      water: ['Micellar Cleansing Water', 'Micellar Gentle Peeling Water'],
      moisturiser: ['Even & Bright Vitamin C Water Gel', 'Even & Bright Vitamin C Cream for Very Oily Skin', 'Pure Active AHA+BHA Charcoal Air Cream'
      ],
      serum: ['Even & Bright 3.5% Vitamin C Day Booster Serum',
        'Even & Bright Night Serum', 'Pure Active AHA+BHA Charcoal Anti-Blemish Serum', 'Even & Bright Vitamin C Dark Spot Corrector'
      ],
      sunscreen: [
        'Super UV Air-Mist Sunscreen SPF50', 'Super UV Invisible Serum Sunscreen Vitamin C', 'Super UV Cooling Watergel Sunscreen Vitamin C', 'Even & Bright Vitamin C Protection Day Cream SPF30'
      ],
      exfoliant: ['Even & Bright Vitamin C Gentle Clarifying Face Scrub']
    },
    cerave: {
      cleanser: [
        'Hydrating Cleanser', 'Foaming Cleanser', 'Hydrating Cream-to-Foam Cleanser', 'SA Smoothing Cleanser',
        'Blemish Control Cleanser', 'Hydrating Foaming Oil Cleanser'
      ],
      moisturiser: [
        'Moisturising Cream', 'Moisturising Lotion', 'Facial Moisturising Lotion', 'Facial Moisturising Lotion PM',
        'Oil Control Moisturising Gel-Cream', 'Intensive Moisturising Cream', 'SA Smoothing Cream', 'Skin Renewing Peptide Cream'
      ],
      serum: ['Skin Renewing Vitamin C Serum', 'Resurfacing Retinol Serum', 'Hydrating Hyaluronic Acid Serum', 'Skin Renewing Retinol Serum'],
      sunscreen: ['Facial Moisturising Lotion SPF30', 'Facial Moisturising Lotion SPF50'],
      repair: ['Advanced Repair Ointment'],
      eyelip: ['Eye Repair Cream', 'Skin Renewing Eye Cream']
    },
    eucerin: {
      cleanser: [
        'DermoPure Purifying Cleanser',
        'DermatoCLEAN Refreshing Cleansing Gel'
      ],
      water: ['DermoPure Toner'],
      moisturiser: [
        'DermoPure Hydra Repair', 'DermoPure Clinical Mattifying Fluid', 'Hyaluron-Filler Day Cream', 'Hyaluron-Filler Night Cream',
        'Hyaluron-Filler + Elasticity Day Cream', 'Hyaluron-Filler + Elasticity Night Cream', 'Original Extra Thick Creme'
      ],
      serum: ['Even Pigment Perfector Dual Serum', 'Even Pigment Perfector Serum',
        'Hyaluron-Filler Epicelline Serum', 'Anti-Pigment Spot Corrector'
      ],
      sunscreen: [
        'Sun Face Oil Control Gel-Cream SPF50+', 'Sun Face Hydro Protect SPF50+', 'Sun Face Photoaging Control SPF50+',
        'Sun Body Gel-Cream Dry Touch', 'Sun Sensitive Protect'
      ],
      body: [
        'pH5 Soft Body Cream', 'UreaRepair PLUS 10% Urea Lotion',
        'UreaRepair PLUS 5% Urea Hand Cream', 'Even Pigment Perfector Sensitive Areas Body Serum', 'Hyaluron-Filler + Elasticity Hand Cream'
      ],
      repair: ['Aquaphor Soothing Skin Balm', 'Aquaphor Repairing Ointment']
    },
    avene: {
      cleanser: [
        'Cleanance Cleansing Gel', 'Tolerance Extremely Gentle Cleanser', 'XeraCalm A.D Cleansing Oil'
      ],
      water: ['Cleanance Micellar Water', 'Thermal Spring Water'],
      moisturiser: [
        'Hydrance Light Hydrating Emulsion', 'Hydrance Rich Hydrating Cream', 'Hydrance Aqua-Gel', 'Tolerance Hydra-10 Cream',
        'Tolerance Hydra-10 Fluid', 'Tolerance Control Soothing Skin Recovery Cream', 'Hyaluron Activ B3 Cellular Renewal Cream',
        'Revitalizing Nourishing Cream'
      ],
      serum: [
        'Hyaluron Activ B3 Serum', 'Cicalfate+ Intensive Recovery Serum', 'Vitamin Activ Cg Serum', 'Cleanance Comedomed'
      ],
      repair: [
        'Cicalfate+ Restorative Protective Cream', 'XeraCalm A.D Lipid-Replenishing Balm', 'XeraCalm A.D Lipid-Replenishing Cream',
        'Tolerance Control Soothing Skin Recovery Balm'
      ],
      sunscreen: [
        'Hydrance SPF30 Hydrating Cream', 'Very High Protection Cream SPF50+', 'Intense Protect SPF50+', 'Mineral Sunscreen SPF50+', 'Anti-Ageing Sunscreen SPF50+'
      ],
      eyelip: ['Cicalfate+ Lips']
    }
  };
  /* Removed on 2026-11-22 (owner's request): products with no real product photo,
     most of them old names or not sold in South Africa. See images/report.md.
     "Even & Matte Vitamin C Face Scrub" is listed under its current name,
     Even & Bright Vitamin C Gentle Clarifying Face Scrub (Garnier renamed the range).
     Merged from the owner's list (same product listed twice):
     Garnier "Pure Active 3-in-1 Clay" = "Pure Active 3-in-1 Clay Cleanser";
     CeraVe "SA Smoothing Cream", "Moisturising Cream", "Moisturising Lotion" (also under body care);
     Avène "Cicalfate+ Repairing Protective Cream" = "Cicalfate+ Restorative Protective Cream";
     Avène "Tolérance Soothing Skin Recovery Balm" = "Tolerance Control Soothing Skin Recovery Balm". */

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

  /* Which packaging the illustration uses, from words in the name. */
  function shapeOf(name, type) {
    if (/Patches/.test(name)) return 'patches';
    if (/Air-Mist|Thermal Spring Water/.test(name)) return 'spray';
    if (type === 'eyelip') return 'minitube';
    if (/Hand Cream/.test(name)) return 'tube';
    if (type === 'sunscreen') return /Lotion/.test(name) ? 'pump' : 'tube';
    if (/Micellar|Toner|Peeling Water|Jelly/.test(name)) return 'flip';
    if (type === 'cleanser') return /Foam|Foaming/.test(name) ? 'foam' : 'pump';
    if (/Serum|Booster|Corrector|Concentrate|Comedomed$/.test(name)) return 'dropper';
    if (/Scrub|Peeling|Ointment|Balm|Cicalfate|Recovery|Fluid|Emulsion|Hydra Repair/.test(name)) return 'tube';
    if (/Lotion/.test(name)) return 'pump';
    if (/Cream|Creme|Gel|Aqua/.test(name)) return 'jar';
    return 'pump';
  }

  function slug(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\+/g, ' plus ').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  var CAPS = { garnier: 'ink', cerave: 'white', eucerin: 'silver', avene: 'gold' };
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
          range: range, chips: chips.slice(0, 2), shape: shapeOf(name, typeId), tone: t.tone, cap: CAPS[b.id]
        });
      });
    });
  });

  global.NEXERA_SKIN = { EMAIL: EMAIL, BRANDS: BRANDS, TYPES: TYPES, STEPS: STEPS, PRODUCTS: PRODUCTS, typeById: typeById, brandById: brandById };
})(typeof window !== 'undefined' ? window : globalThis);
