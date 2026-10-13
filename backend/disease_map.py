"""
Real plant disease database for AgroVision AI.
Data sourced from: CABI Crop Protection Compendium, EPPO Global Database,
PlantVillage (Penn State), FAO Plant Production and Protection Papers.

Each entry includes:
  - Scientific name of pathogen
  - Pathogen type (fungal / bacterial / viral / oomycete / abiotic)
  - Host crops
  - Visual symptoms
  - Recommended treatments (chemical & biological)
  - Prevention measures
  - Source reference
"""
from __future__ import annotations
from typing import TypedDict


class DiseaseInfo(TypedDict):
    scientific_name: str       # Pathogen binomial
    pathogen_type: str         # fungal | bacterial | viral | oomycete | nematode | abiotic
    host_crops: list[str]      # Affected crop list
    symptoms: str              # Visual symptoms description
    treatment: str             # Recommended fungicide / bactericide / cultural practice
    prevention: str            # Preventive measures
    severity_profile: str      # Brief epidemiological note
    source: str                # Reference / DOI


# ---------------------------------------------------------------------------
# Disease database — 32 major crop diseases (globally researched)
# ---------------------------------------------------------------------------
DISEASE_DB: dict[str, DiseaseInfo] = {

    # ══════════════════════════════════════════════════════════════
    # RICE DISEASES
    # ══════════════════════════════════════════════════════════════
    "rice blast": {
        "scientific_name": "Magnaporthe oryzae",
        "pathogen_type": "fungal",
        "host_crops": ["Rice"],
        "symptoms": "Diamond-shaped lesions with gray centers and brown borders on leaves. Collar rot at the node causes stem breakage. Neck blast at the panicle base causes 'rotten neck' and empty grains.",
        "treatment": "Tricyclazole (0.06% spray), Propiconazole (EC 25%), or Azoxystrobin at 7-day intervals. In severe outbreaks combine with Carbendazim.",
        "prevention": "Use resistant cultivars (IR64, Swarna). Avoid excess nitrogen fertilizer. Maintain field hygiene — remove infected debris after harvest.",
        "severity_profile": "Most devastating rice disease worldwide; can cause 70-80% yield loss in severe epidemics. Spreads rapidly under cool, humid conditions (22-28°C).",
        "source": "IRRI Rice Knowledge Bank; Skamnioti & Gurr (2009) Mol Plant Pathol",
    },
    "bacterial leaf blight": {
        "scientific_name": "Xanthomonas oryzae pv. oryzae",
        "pathogen_type": "bacterial",
        "host_crops": ["Rice"],
        "symptoms": "Water-soaked to yellowish stripe along leaf margins progressing from tips downward. Affected areas turn straw-colored. Bacterial ooze (creamy droplets) visible in morning dew.",
        "treatment": "Copper hydroxide or Copper oxychloride spray. Reduce nitrogen top-dressing. No fully effective curative bactericide — cultural management is primary.",
        "prevention": "Use resistant varieties (IR36, IRBB21). Avoid deep flooding and high N fertilizer. Use certified disease-free seeds.",
        "severity_profile": "Spreads through irrigation water and wind-driven rain. Major constraint in irrigated lowland rice in tropical Asia.",
        "source": "Niño-Liu et al. (2006) Mol Plant Pathol; CABI CPC",
    },
    "brown spot": {
        "scientific_name": "Cochliobolus miyabeanus (Bipolaris oryzae)",
        "pathogen_type": "fungal",
        "host_crops": ["Rice"],
        "symptoms": "Circular to oval spots, brown with a yellow halo on leaves. Spots have a dark brown border and grayish center. Seedling blight in nurseries causes 'sesame leaf disease' appearance.",
        "treatment": "Mancozeb (2 g/L) or Propiconazole sprays. Seed treatment with Carbendazim reduces seedling infection.",
        "prevention": "Balanced potassium and silicon fertilization strengthens cell walls. Avoid drought stress during tillering.",
        "severity_profile": "Historically caused the 1943 Bengal Famine. Now controlled with resistant varieties but still causes 5-45% yield loss in nutrient-deficient fields.",
        "source": "Chakrabarti (2001) Advances in Agronomy; FAO",
    },
    "leaf scald": {
        "scientific_name": "Microdochium oryzae (Helminthosporium sigmoideam)",
        "pathogen_type": "fungal",
        "host_crops": ["Rice"],
        "symptoms": "Zonate banding pattern of light tan and brown on older leaf sheaths and blades. Lesions have alternating dark and light bands giving a 'scalded' appearance.",
        "treatment": "Propiconazole or Tebuconazole fungicides. Often occurs alongside sheath blight — combined management strategies.",
        "prevention": "Reduce canopy density. Avoid continuous flooding; drain periodically. Limit nitrogen application rates.",
        "severity_profile": "Common in high-rainfall tropical environments; rarely causes severe yield losses but weakens plants, increasing susceptibility to other pathogens.",
        "source": "IRRI; CABI CPC",
    },
    "sheath blight": {
        "scientific_name": "Rhizoctonia solani AG1-IA",
        "pathogen_type": "fungal",
        "host_crops": ["Rice", "Corn", "Soybean"],
        "symptoms": "Oval to irregular grayish-white lesions with dark brown borders on leaf sheath. Lesions merge to form large blighted areas. Lodging in severe cases.",
        "treatment": "Hexaconazole (5% EC), Propiconazole, or Validamycin A at panicle initiation stage.",
        "prevention": "Reduce plant density; skip irrigation to suppress sclerotia germination. Remove crop residue after harvest.",
        "severity_profile": "Second most important rice disease after blast. Responsible for 6% average global rice yield loss; epidemic in high-yielding, densely planted fields.",
        "source": "Banniza & Bhatt (2003) Euphytica; CABI CPC",
    },

    # ══════════════════════════════════════════════════════════════
    # FUNGAL LEAF DISEASES (MULTI-CROP)
    # ══════════════════════════════════════════════════════════════
    "powdery mildew": {
        "scientific_name": "Erysiphe cichoracearum / Blumeria graminis (various spp.)",
        "pathogen_type": "fungal",
        "host_crops": ["Wheat", "Barley", "Cucumber", "Squash", "Mango", "Grape"],
        "symptoms": "White to gray powdery fungal growth on upper leaf surfaces, stems and young fruit. Infected tissue turns yellow then brown. Severely infected plants show stunted growth.",
        "treatment": "Sulfur-based fungicides (Wettable Sulfur 80 WP), Myclobutanil, Trifloxystrobin, or Penconazole. Biological: potassium bicarbonate spray.",
        "prevention": "Plant resistant varieties. Ensure good air circulation — avoid dense canopy. Avoid overhead irrigation; water in the morning.",
        "severity_profile": "Obligate biotroph; thrives in warm dry days (20-27°C) with low humidity nights. Explosive spread possible in controlled environments.",
        "source": "Braun & Cook (2012) CBS Biodiversity Series; EPPO",
    },
    "downy mildew": {
        "scientific_name": "Peronospora spp. / Plasmopara viticola",
        "pathogen_type": "oomycete",
        "host_crops": ["Corn", "Sorghum", "Cucumber", "Spinach", "Grape"],
        "symptoms": "Angular yellow or pale green spots on upper leaf surface, corresponding to grayish-white downy sporulation on underside. Severe infection causes 'crazy top' in corn — shoot malformation.",
        "treatment": "Metalaxyl-M (Ridomil Gold) or Dimethomorph. Mancozeb as protectant. Phosphonate-based compounds for systemic activity.",
        "prevention": "Seed treatment with Metalaxyl. Use resistant hybrids. Improve drainage to reduce soil moisture favoring sporangia germination.",
        "severity_profile": "Oomycete — not a true fungus; insensitive to many conventional fungicides. Highly destructive under cool, wet conditions (10-20°C).",
        "source": "Cohen et al. (2015) Annu Rev Phytopathol; CABI CPC",
    },
    "rust": {
        "scientific_name": "Puccinia spp. (various)",
        "pathogen_type": "fungal",
        "host_crops": ["Wheat", "Corn", "Sugarcane", "Coffee", "Soybean"],
        "symptoms": "Small, raised, brick-red to orange pustules (uredinia) on leaf surfaces and stems. Pustules burst releasing masses of powdery reddish-brown spores. Heavy infection causes premature leaf death.",
        "treatment": "Propiconazole (25 EC), Triadimefon, Azoxystrobin, or Tebuconazole. Triazole + strobilurin combination most effective.",
        "prevention": "Plant resistant varieties. Destroy volunteer plants that harbor inoculum. Scout fields regularly during the growing season.",
        "severity_profile": "Wind-borne spores can travel hundreds of miles. Epidemics develop rapidly — 7-10 day infection cycle under favorable conditions (18-22°C).",
        "source": "Roelfs et al. (1992) CIMMYT; USDA-ARS",
    },
    "early blight": {
        "scientific_name": "Alternaria solani",
        "pathogen_type": "fungal",
        "host_crops": ["Tomato", "Potato", "Eggplant"],
        "symptoms": "Dark brown to black spots with concentric rings (target board pattern) on older leaves. Yellow chlorotic halo surrounds lesions. Stems show dark cankers at soil line. Tubers develop dark, sunken lesions.",
        "treatment": "Chlorothalonil, Mancozeb (M-45), Copper-based fungicides, or Azoxystrobin. Apply preventively before symptoms appear during wet seasons.",
        "prevention": "Use certified disease-free transplants. Rotate crops (3-year rotation). Stake plants to improve air circulation. Irrigate at base, not overhead.",
        "severity_profile": "Polycyclic disease with 3-5 day cycles under warm (24-29°C), humid conditions. Causes 50-80% defoliation in susceptible varieties without management.",
        "source": "Foolad et al. (2008) Plant Dis; CABI CPC",
    },
    "late blight": {
        "scientific_name": "Phytophthora infestans",
        "pathogen_type": "oomycete",
        "host_crops": ["Potato", "Tomato"],
        "symptoms": "Water-soaked, pale-green lesions on leaf edges turning dark brown-black. White sporulation on undersurface in humid conditions. Stems develop dark brown rot. Potato tubers show copper-brown internal dry rot.",
        "treatment": "Metalaxyl + Mancozeb (Ridomil Gold), Cymoxanil, Dimethomorph, or Fenamidone. Act immediately — disease can destroy a field in 4-7 days.",
        "prevention": "Plant certified pathogen-free seed tubers. Destroy cull piles. Apply protectant fungicides before infection during cool, wet weather.",
        "severity_profile": "Caused the 1845-1849 Irish Potato Famine killing 1 million people. Under ideal conditions (cool 10-20°C, >90% RH) can destroy entire fields within days.",
        "source": "Fry (2008) Phytopathology; FAO 1993",
    },
    "gray leaf spot": {
        "scientific_name": "Cercospora zeae-maydis",
        "pathogen_type": "fungal",
        "host_crops": ["Corn"],
        "symptoms": "Small, rectangular lesions that follow leaf veins. Initially tan to brown, maturing to grayish centers with tan borders. Lesions run parallel to veins, giving a streaked appearance. Severely affected leaves die from tip down.",
        "treatment": "Triazole fungicides (Propiconazole, Tebuconazole) or Strobilurin + Triazole premixes at tasseling stage.",
        "prevention": "Use resistant hybrids. Implement 2-year crop rotation (corn-soybean). Till crop residue to reduce inoculum.",
        "severity_profile": "Major constraint in conservation tillage systems where corn residue accumulates. Epidemics triggered by humid weather (>90% RH) during canopy closure.",
        "source": "Ward et al. (1999) Plant Dis; USDA-ARS",
    },
    "northern corn leaf blight": {
        "scientific_name": "Exserohilum turcicum (Setosphaeria turcica)",
        "pathogen_type": "fungal",
        "host_crops": ["Corn"],
        "symptoms": "Large, cigar-shaped tan lesions 2.5-15 cm long with wavy margins. Gray-green in early stages, turning tan to brown with dark sporulation. Multiple lesions coalesce causing large blighted areas.",
        "treatment": "Propiconazole, Azoxystrobin, or Pyraclostrobin + Metconazole. Timing at VT (tasseling) provides best economic return.",
        "prevention": "Resistant hybrids (Ht1, Ht2, Htn1 genes). Crop rotation with non-grass hosts. Incorporate residue to reduce overwintering inoculum.",
        "severity_profile": "Economic damage occurs when infection reaches upper canopy before grain fill. Can cause 30-50% yield loss in susceptible hybrids without management.",
        "source": "Lipps & Mills (1991) Ohio State Ext.; CABI CPC",
    },
    "anthracnose": {
        "scientific_name": "Colletotrichum spp. (C. gloeosporioides, C. acutatum)",
        "pathogen_type": "fungal",
        "host_crops": ["Mango", "Banana", "Avocado", "Strawberry", "Pepper", "Citrus"],
        "symptoms": "Sunken, dark brown to black lesions on fruit, leaves, and stems. On fruit: post-harvest rot appears as dark circular spots. On leaves: brown lesions with yellow margins. Salmon-pink spore masses (acervuli) visible in humid conditions.",
        "treatment": "Propiconazole, Azoxystrobin, or Copper-based fungicides during flowering. Post-harvest: hot water treatment (52°C/5min) or Thiabendazole dip.",
        "prevention": "Remove mummified fruit and infected debris. Ensure good orchard sanitation. Apply protectant fungicides at pre-bloom, full bloom, and petal fall.",
        "severity_profile": "Most important post-harvest disease in tropical fruits. Quiescent (latent) infections develop during ripening — fruit appear healthy at harvest but rot in storage.",
        "source": "Cannon et al. (2012) Studies in Mycology; Prusky et al. (2013)",
    },
    "leaf spot": {
        "scientific_name": "Cercospora spp. / Septoria spp. (various)",
        "pathogen_type": "fungal",
        "host_crops": ["Corn", "Soybean", "Beet", "Peanut", "Rice"],
        "symptoms": "Circular to irregular spots ranging from 2-10mm, with tan, gray or brown centers and dark brown to purple borders. Yellow chlorotic halos visible on some hosts. Premature defoliation in severe cases.",
        "treatment": "Mancozeb (M-45), Propiconazole, Chlorothalonil, or Azoxystrobin. Apply at first sign of disease; repeat at 14-day intervals during wet periods.",
        "prevention": "Use resistant varieties where available. Crop rotation to reduce soilborne inoculum. Avoid sprinkler irrigation during evening hours.",
        "severity_profile": "Common on many crops; severity depends on weather. Polycyclic — multiple infection cycles per season possible under favorable conditions.",
        "source": "CABI CPC; EPPO Global Database",
    },

    # ══════════════════════════════════════════════════════════════
    # SUGARCANE DISEASES
    # ══════════════════════════════════════════════════════════════
    "sugarcane smut": {
        "scientific_name": "Sporisorium scitamineum (Ustilago scitaminea)",
        "pathogen_type": "fungal",
        "host_crops": ["Sugarcane"],
        "symptoms": "A long black whip-like structure (sorus) emerges from the shoot apex — this is the pathogen's spore mass enclosed in a silver membrane. Infected stools produce multiple thin grass-like shoots. Sucrose content severely reduced.",
        "treatment": "Sett treatment: hot water (50°C for 2 hours) + Carboxin/Thiram dust. No effective curative sprays once established.",
        "prevention": "Use certified disease-free planting material. Plant resistant varieties. Rogue infected stools immediately — bag and destroy the smut whip before it ruptures.",
        "severity_profile": "Spreads through airborne spores and infected planting material. Losses of 30-80% yield in susceptible varieties. Complete replanting of infected fields required.",
        "source": "Walker (2006) Proc Int Soc Sugarcane Technol; CABI CPC",
    },
    "sugarcane mosaic": {
        "scientific_name": "Sugarcane mosaic virus (SCMV), Potyvirus",
        "pathogen_type": "viral",
        "host_crops": ["Sugarcane", "Corn", "Sorghum"],
        "symptoms": "Light green to yellow mosaic patterns on young leaves alternating with normal green tissue. Chlorotic streaking parallel to leaf veins. Stunted plant growth; reduced tillering and stalk elongation.",
        "treatment": "No chemical cure. Rogue and destroy infected plants immediately. Control aphid vectors with Imidacloprid or Thiamethoxam.",
        "prevention": "Plant virus-free certified planting material. Use resistant varieties (CP 72-2086, NCo 376). Control aphid populations (Melanaphis sacchari) — primary vector.",
        "severity_profile": "Transmitted by at least 20 aphid species in non-persistent manner. Yield losses of 10-70% depending on variety susceptibility and time of infection.",
        "source": "Viswanathan & Balamuralikrishnan (2005) Crop Protection; ISSCT",
    },

    # ══════════════════════════════════════════════════════════════
    # CASSAVA DISEASES
    # ══════════════════════════════════════════════════════════════
    "cassava mosaic": {
        "scientific_name": "African Cassava Mosaic Virus (ACMV) / Sri Lanka Cassava Mosaic Virus (SLCMV), Begomovirus",
        "pathogen_type": "viral",
        "host_crops": ["Cassava"],
        "symptoms": "Yellow or pale green mosaic and mottling on leaves. Leaf chlorosis, distortion, and size reduction. Plants appear stunted with small, misshapen leaves. Tubers may be thin and small.",
        "treatment": "No curative treatment. Remove and destroy infected plants (do NOT compost). Control whitefly vector aggressively with Imidacloprid or Thiamethoxam.",
        "prevention": "Plant virus-free stem cuttings from certified sources. Use resistant varieties (NASE 19, TMS 60444). Field sanitation — eliminate infected material before new planting.",
        "severity_profile": "Transmitted by Bemisia tabaci whitefly in semi-persistent manner. Major pandemic in Sub-Saharan Africa and South/Southeast Asia. Can cause 20-100% yield loss.",
        "source": "Legg et al. (2015) Annu Rev Phytopathol; FAO",
    },
    "cassava bacterial blight": {
        "scientific_name": "Xanthomonas axonopodis pv. manihotis",
        "pathogen_type": "bacterial",
        "host_crops": ["Cassava"],
        "symptoms": "Angular, water-soaked lesions on leaves delimited by leaf veins. Lesions turn brown and necrotic. Stem exudate (gummosis) visible on young stems. Shoot dieback and wilting of growing tips.",
        "treatment": "Copper-based bactericides (Copper hydroxide). Remove infected plant parts. No highly effective chemical cure — prevention is key.",
        "prevention": "Plant disease-free cuttings. Use resistant varieties. Avoid working in fields when plants are wet. Disinfect cutting tools between plants with 10% bleach.",
        "severity_profile": "Spreads through rain splash, tools, and infected propagation material. Severe epidemics during rainy seasons can cause 100% crop failure in susceptible varieties.",
        "source": "Verdier et al. (2004) Plant Dis; CABI CPC",
    },

    # ══════════════════════════════════════════════════════════════
    # BANANA DISEASES
    # ══════════════════════════════════════════════════════════════
    "panama disease": {
        "scientific_name": "Fusarium oxysporum f. sp. cubense (FOC)",
        "pathogen_type": "fungal",
        "host_crops": ["Banana", "Plantain"],
        "symptoms": "Yellow discoloration of oldest leaves progressing to younger leaves; leaves collapse and hang down. Internal vascular discoloration — brown or red streaking in pseudostem cross-section. Plants die before or just after flowering.",
        "treatment": "No effective chemical treatment. Infected plants must be removed. Soil solarization may reduce inoculum. Biological control with Trichoderma spp. shows some promise.",
        "prevention": "Plant resistant Cavendish subgroup varieties (resistant to Race 1) or TR4-resistant cultivars like GCTCV-218. Strict quarantine — prevent movement of infected soil, planting material, water.",
        "severity_profile": "Tropical Race 4 (TR4) currently threatens global banana production — Cavendish (98% of export bananas) is fully susceptible. Pathogen persists in soil for 30+ years.",
        "source": "Ploetz (2015) Phytopathology; FAO 2015",
    },
    "banana sigatoka": {
        "scientific_name": "Mycosphaerella musicola (Yellow Sigatoka) / M. fijiensis (Black Sigatoka)",
        "pathogen_type": "fungal",
        "host_crops": ["Banana", "Plantain"],
        "symptoms": "Yellow Sigatoka: pale yellow streaks on young leaves, enlarging to brown oval spots with yellow borders. Black Sigatoka (more severe): narrow brown streaks with black borders; premature leaf death and fruit ripening.",
        "treatment": "Propiconazole, Trifloxystrobin, or Mancozeb. Plantations require 6-52 fungicide applications per year. Oil sprays for biological suppression.",
        "prevention": "Remove oldest affected leaves (leaf pruning). Maintain field drainage. Plant resistant hybrids (FHIA-01, FHIA-21). Avoid overcrowding.",
        "severity_profile": "Black Sigatoka can reduce yield by 50% in susceptible varieties; requires intensive fungicide programs. Fungicide resistance is a growing concern globally.",
        "source": "Stover (1980) Banana, Plantain & Abaca Diseases; CABI CPC",
    },

    # ══════════════════════════════════════════════════════════════
    # GENERAL / MULTI-CROP
    # ══════════════════════════════════════════════════════════════
    "bacterial blight": {
        "scientific_name": "Xanthomonas campestris / X. oryzae (various pathovars)",
        "pathogen_type": "bacterial",
        "host_crops": ["Rice", "Cotton", "Pepper", "Cabbage", "Citrus"],
        "symptoms": "Translucent, water-soaked lesions on leaves that turn brown to yellow as they expand. Irregular blighted areas with a distinct margin between healthy and diseased tissue. Bacterial exudate may be visible as sticky droplets.",
        "treatment": "Copper-based bactericides (Copper hydroxide, Copper oxychloride). Streptomycin sulfate (where permitted). Reduce nitrogen fertilization.",
        "prevention": "Use disease-free certified seed. Remove infected plant debris. Avoid overhead irrigation and working in wet fields. Rotate with non-host crops.",
        "severity_profile": "Spreads rapidly through water splash, insects, and wounds. Warm, wet weather (25-35°C) with high humidity promotes explosive spread.",
        "source": "Leyns et al. (1984) J Appl Bacteriol; EPPO",
    },
    "wilt": {
        "scientific_name": "Fusarium oxysporum / Verticillium dahliae (various f. sp.)",
        "pathogen_type": "fungal",
        "host_crops": ["Tomato", "Pepper", "Cotton", "Cassava", "Banana"],
        "symptoms": "Progressive yellowing and wilting of leaves, typically starting on one side of the plant or one branch. Vascular browning visible in stem cross-section. Plants collapse and die; roots show brown discoloration.",
        "treatment": "No effective curative chemical treatment once established. Soil fumigation with Metam Sodium pre-plant. Biological: Trichoderma harzianum or Bacillus subtilis soil inoculants.",
        "prevention": "Plant resistant varieties. Long crop rotation (4-6 years) with non-susceptible hosts. Solarize soil. Improve drainage — waterlogging promotes pathogen spread.",
        "severity_profile": "Soilborne; persists as chlamydospores for 30+ years. Losses of 10-80% depending on soil inoculum level. No replanting of susceptible hosts in infested soil.",
        "source": "Fravel et al. (2003) Biol Control; CABI CPC",
    },
    "leaf rust": {
        "scientific_name": "Puccinia triticina (wheat) / P. polysora (corn) / P. melanocephala (sugarcane)",
        "pathogen_type": "fungal",
        "host_crops": ["Wheat", "Corn", "Sugarcane", "Barley"],
        "symptoms": "Small, circular to elongated orange-red pustules (uredinia) scattered across leaf surface. Pustules rupture releasing masses of rust-colored urediniospores. Infected leaves turn yellow and die prematurely.",
        "treatment": "Propiconazole (EC 25%) or Tebuconazole at first sign of disease. Triazole + Strobilurin mixtures for broad-spectrum protection.",
        "prevention": "Grow resistant varieties. Avoid planting susceptible crops near alternate hosts. Scout fields during vegetative stages to catch early infections.",
        "severity_profile": "Wind-dispersed spores travel long distances. Infection cycle as short as 7-10 days. A single unprotected susceptible field can generate billions of spores infecting neighboring areas.",
        "source": "McIntosh et al. (1995) Wheat Rusts; CABI CPC",
    },
    "septoria leaf spot": {
        "scientific_name": "Septoria tritici / Zymoseptoria tritici",
        "pathogen_type": "fungal",
        "host_crops": ["Wheat", "Barley"],
        "symptoms": "Pale green to yellow blotches on older leaves expanding into irregular tan to brown lesions with wavy margins. Small black dots (pycnidia) visible within lesions — diagnostic feature. Lesions can coalesce to blight entire leaves.",
        "treatment": "Azoxystrobin, Propiconazole, Epoxiconazole. Apply at GS31-32 (stem extension) and GS37-39 (flag leaf emergence) for maximum economic return.",
        "prevention": "Plant resistant varieties. Bury crop residue — pathogen overwinters on stubble. Maintain 3-year rotation from small grains.",
        "severity_profile": "Most economically important foliar disease of wheat in Europe. Can cause 30-50% yield loss without protection. Rain-splash dispersed — epidemic buildup requires several wet periods.",
        "source": "Torriani et al. (2015) Plant Pathol; HGCA/AHDB UK",
    },
    "cercospora leaf spot": {
        "scientific_name": "Cercospora arachidicola / C. kikuchii (various hosts)",
        "pathogen_type": "fungal",
        "host_crops": ["Peanut", "Soybean", "Sugar beet", "Coffee"],
        "symptoms": "Circular brown spots with yellow halos on older leaves. Spots have a tan center with a dark brown border. Premature defoliation weakens plants significantly. On peanut: two species — early (C. arachidicola) and late (C. personatum) leaf spot.",
        "treatment": "Chlorothalonil, Mancozeb, Tebuconazole, or Azoxystrobin. Begin applications 30 days after planting; repeat at 14-day intervals.",
        "prevention": "Crop rotation (3+ years). Plant resistant varieties. Promptly remove infected plant debris after harvest. Avoid overhead irrigation in evenings.",
        "severity_profile": "Can cause 50-70% yield loss in unprotected peanut. Defoliation reduces pod fill. Multiple infection cycles per season under warm, humid conditions.",
        "source": "Porter et al. (1982) Plant Dis; CABI CPC",
    },
    "root rot": {
        "scientific_name": "Phytophthora sojae / Rhizoctonia solani / Pythium spp.",
        "pathogen_type": "oomycete",
        "host_crops": ["Soybean", "Corn", "Wheat", "Sugar beet"],
        "symptoms": "Seedling damping-off — pre-emergence death or post-emergence collapse at soil line. Established plants: yellowing of lower leaves, brown discoloration of roots and lower stem. Rotted roots have brown to black water-soaked appearance.",
        "treatment": "Seed treatment: Metalaxyl-M (Apron XL) for oomycetes; Thiabendazole for Rhizoctonia. In-furrow Trichoderma applications. No foliar sprays effective.",
        "prevention": "Improve soil drainage. Avoid compaction — use tile drainage in flood-prone areas. Plant resistant soybean varieties (Rps genes for Phytophthora). Delay planting in cold, wet soils.",
        "severity_profile": "Major cause of stand loss and replant failure. Most destructive in cold, wet soils. Early-season damage often invisible until plants collapse.",
        "source": "Schmitthenner (1985) Plant Dis; NCERA-137",
    },
    "damping off": {
        "scientific_name": "Pythium spp. / Rhizoctonia solani / Fusarium spp.",
        "pathogen_type": "oomycete",
        "host_crops": ["Tomato", "Pepper", "Cucumber", "Lettuce", "Rice (seedling)"],
        "symptoms": "Pre-emergence: seeds rot before germination. Post-emergence: water-soaked lesion at soil line causes plants to topple over. Collapsed seedlings wilt rapidly; roots are discolored and rotted.",
        "treatment": "Thiram or Captan seed treatments. Drench with Metalaxyl-M for Pythium; Thiophanate-methyl for Rhizoctonia. Hydrogen peroxide (H₂O₂) as organic treatment.",
        "prevention": "Use sterile growing media in nurseries. Avoid overwatering. Ensure adequate light and air circulation. Pasteurize soil or use soilless growing media.",
        "severity_profile": "Major nursery problem causing 10-90% seedling loss. Favored by cool, wet, poorly-drained conditions. Once established spreads rapidly through water movement.",
        "source": "Agrios (2005) Plant Pathology 5th Ed.; CABI CPC",
    },
    "fire blight": {
        "scientific_name": "Erwinia amylovora",
        "pathogen_type": "bacterial",
        "host_crops": ["Apple", "Pear", "Quince", "Hawthorn"],
        "symptoms": "Shoot tips turn brown and curl down resembling a 'shepherd's crook'. Blossoms wilt and turn brown. Cankers on branches exude amber-colored bacterial ooze in wet weather. Affected tissue appears scorched by fire — hence the name.",
        "treatment": "Copper bactericides or Streptomycin sprays during bloom (where permitted). Prune out infected branches 20-30 cm below visible symptoms. Sterilize pruning tools with 10% bleach between cuts.",
        "prevention": "Avoid excessive nitrogen that promotes succulent growth. Plant resistant varieties. Do not prune during wet, warm weather. Monitor bloom period closely.",
        "severity_profile": "Most destructive disease of apples and pears. Bacteria enter through flowers, wounds, and natural openings. Epidemics can destroy entire orchards in one season.",
        "source": "Norelli et al. (2003) Plant Dis; EPPO A2 list",
    },
    "citrus canker": {
        "scientific_name": "Xanthomonas citri subsp. citri",
        "pathogen_type": "bacterial",
        "host_crops": ["Citrus (all species)", "Lemon", "Grapefruit", "Orange"],
        "symptoms": "Raised, corky, crater-like lesions with water-soaked margins on leaves, stems, and fruit. Lesions have a yellow halo (oily ring) when viewed against light. Premature leaf and fruit drop.",
        "treatment": "Copper bactericides (Copper hydroxide, Copper octanoate) applied preventively and following rain events. No curative treatment.",
        "prevention": "Use canker-free nursery stock. Establish windbreaks to reduce spread. Strict quarantine — regulated pest in many countries; infected trees may require removal.",
        "severity_profile": "Quarantine pest in USA, Australia, and many countries. Spreads via wind-driven rain, insects, and human movement. Can devastate entire citrus industries — economic losses >$1 billion per epidemic.",
        "source": "Graham et al. (2004) Plant Dis; USDA APHIS",
    },
    "healthy": {
        "scientific_name": "N/A — no pathogen detected",
        "pathogen_type": "none",
        "host_crops": [],
        "symptoms": "No disease symptoms detected. Leaf tissue appears uniformly green with no lesions, spots, discoloration, or abnormalities.",
        "treatment": "No treatment required.",
        "prevention": "Maintain plant health with balanced nutrition, adequate water management, and regular scouting to catch problems early.",
        "severity_profile": "Healthy plant tissue — continue monitoring.",
        "source": "N/A",
    },
}

PATHOGEN_TYPE_COLORS = {
    "fungal":    {"badge": "bg-orange-400/15 text-orange-300 border-orange-400/30",    "dot": "#f97316"},
    "bacterial": {"badge": "bg-blue-400/15 text-blue-300 border-blue-400/30",          "dot": "#60a5fa"},
    "viral":     {"badge": "bg-purple-400/15 text-purple-300 border-purple-400/30",    "dot": "#a78bfa"},
    "oomycete":  {"badge": "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",          "dot": "#22d3ee"},
    "nematode":  {"badge": "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",    "dot": "#fbbf24"},
    "abiotic":   {"badge": "bg-emerald-400/15 text-emerald-300 border-emerald-400/30", "dot": "#34d399"},
    "none":      {"badge": "bg-emerald-400/15 text-emerald-300 border-emerald-400/30", "dot": "#34d399"},
}


def _normalize(name: str) -> str:
    return name.lower().strip()


def get_disease_info(model_class_name: str) -> DiseaseInfo | None:
    """Return disease info for a YOLO class name — exact match then partial."""
    key = _normalize(model_class_name)
    if key in DISEASE_DB:
        return DISEASE_DB[key]
    for db_key, info in DISEASE_DB.items():
        if db_key in key or key in db_key:
            return info
    return None


def enrich_prediction(prediction: dict) -> dict:
    """
    Enrich a prediction dict with real disease info.
    Adds: scientificName, pathogenType, hostCrops, symptoms,
          treatment, prevention, severityProfile, source
    """
    info = get_disease_info(prediction.get("disease", ""))
    if info:
        prediction["scientificName"]  = info["scientific_name"]
        prediction["pathogenType"]    = info["pathogen_type"]
        prediction["hostCrops"]       = info["host_crops"]
        prediction["symptoms"]        = info["symptoms"]
        prediction["treatment"]       = info["treatment"]
        prediction["prevention"]      = info["prevention"]
        prediction["severityProfile"] = info["severity_profile"]
        prediction["source"]          = info["source"]
    else:
        prediction["scientificName"]  = None
        prediction["pathogenType"]    = "unknown"
        prediction["hostCrops"]       = []
        prediction["symptoms"]        = None
        prediction["treatment"]       = None
        prediction["prevention"]      = None
        prediction["severityProfile"] = None
        prediction["source"]          = None
    return prediction
