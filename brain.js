const DEFAULT_KB = {
  packages: [
    "Kids Birthday Classic (10 kids, ₹8,999)", "Kids Birthday Standard (12 kids, ₹12,500)", "Kids Birthday Premium (15 kids + 6 adults, ₹15,500)",
    "Adults Birthday Classic (6 pax, ₹8,000)", "Adults Birthday Standard (8 pax, ₹13,000)", "Adults Birthday Premium (15 pax, ₹23,000)",
    "Anniversary Intimate (2 pax, ₹5,100)", "Anniversary Family (6 pax, ₹9,000)", "Anniversary Grand (40 pax, ₹40,000)",
    "Satyanarayan Katha (min 6 pax, ₹8,500 — Customer Owned: 3 katori, 3 spoon, 3 thali, Brahman Vastra)",
    "Rudrabhishek Puja (min 6 pax, ₹8,300 — Customer Owned: Badi Parat, 2 Bhagonas, Steel Balti, Brahman Vastra)",
    "Grah Pravesh Home (min 6 pax, ₹14,999)", "Grah Pravesh Clubhouse (min 30 pax, ₹37,500)"
  ],
  vendors: ["Suraj", "Kapil Jain", "SG Events", "MM Cakes", "Bento Cakes", "Modi Baker", "Moms Condiment", "Pizzado", "Street Cafe 1", "Anshu / Desi Haandi", "Sarita Aunty", "Mangal Bhawan", "Haldiram's", "Cute Store Irish Pearls", "Sumit", "Akash-Vikas"]
};

function getEntries() {
  return JSON.parse(localStorage.getItem("re_brain_entries") || "[]");
}
function saveEntries(list) {
  localStorage.setItem("re_brain_entries", JSON.stringify(list));
}
function getCustomRules() {
  return JSON.parse(localStorage.getItem("re_custom_rules") || "[]");
}
function saveCustomRules(list) {
  localStorage.setItem("re_custom_rules", JSON.stringify(list));
}

// Intelligent Outcome & Follow-up Gap Detector
function detectMissingOutcome(text) {
  const gaps = [];
  if (/quoted|quote|lead|enquir|inquiry|call|called|messaged|whatsapp|asked/i.test(text) &&
      !/booked|confirmed|advance|paid|closed|lost|not interested|declined|scheduled|follow.?up on|next call|tomorrow|date/i.test(text)) {
    gaps.push("Missing Lead Outcome / Next Follow-Up Date (Quoted or contacted lead, but no booking status or follow-up date logged)");
  }
  if (/issued|took|picked up|pamphlet|blinkit|school|society|mall|temple/i.test(text) &&
      !/returned|remaining|left|0 missing|reconciled|balance/i.test(text)) {
    gaps.push("Missing Pamphlet Return Count (Issued/distributed logged without returned/remaining balance)");
  }
  if (/vendor|cake|baker|pandit|samagri|decor|catering|suraj|kapil|mm cakes|pizzado|sarita|mangal/i.test(text) &&
      !/confirmed|locked|paid|advance|dispatched|delivered|₹|rs/i.test(text)) {
    gaps.push("Missing Vendor Rate / Confirmation Status");
  }
  if (/meta|ad|campaign|boost|spend|₹/i.test(text) && /ad|meta|reel/i.test(text) &&
      !/lead|leads|cpl|reach|clicks|result/i.test(text)) {
    gaps.push("Missing Ad Outcome / Lead Count for Marketing Spend");
  }
  return gaps;
}

// Auto-Splitter incorporating both built-in RitualEase rules + Admin-trained custom rules
function smartSplitUpdate(text) {
  const sentences = text.split(/(?<=[.!?\n])\s+/).map(s => s.trim()).filter(Boolean);
  const buckets = {
    "Field & Pamphlets": [],
    "Sales & WhatsApp Leads": [],
    "Supply Chain & Vendors": [],
    "Marketing & Brand Audit": [],
    "General Ops": []
  };
  const customRules = getCustomRules();
  customRules.forEach(r => { if (!buckets[r.section]) buckets[r.section] = []; });

  const alerts = [];

  sentences.forEach(s => {
    let matched = false;
    // Check admin-trained custom rules first
    customRules.forEach(r => {
      const kws = r.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
      if (kws.some(kw => s.toLowerCase().includes(kw))) {
        buckets[r.section].push(s);
        matched = true;
      }
    });
    if (/pamphlet|blinkit|school|society|mall|temple|distributed|returned|issued|qr|setup|rider/i.test(s)) {
      buckets["Field & Pamphlets"].push(s); matched = true;
    }
    if (/lead|quote|quoted|customer|booked|booking|satyanarayan|rudrabhishek|grah pravesh|birthday|anniversary|whatsapp|sla|utensil|thali|parat/i.test(s)) {
      buckets["Sales & WhatsApp Leads"].push(s); matched = true;
    }
    if (/vendor|cake|baker|pandit|samagri|suraj|kapil|sg events|mm cakes|bento|modi|pizzado|desi haandi|sarita|mangal|haldiram|cute store|sumit|akash|vikas|payout|rate/i.test(s)) {
      buckets["Supply Chain & Vendors"].push(s); matched = true;
    }
    if (/meta|ad|reel|instagram|post|caption|flyer|creative|spend|cpl|mygate|nobrokerhood|linkedin/i.test(s)) {
      buckets["Marketing & Brand Audit"].push(s); matched = true;
    }
    if (!matched) buckets["General Ops"].push(s);
  });

  if (/pink/i.test(text)) alerts.push("⚠️ Brand Alert: 'Pink' mentioned (strictly banned in Brand Kit v4).");
  if (/mumbai|bangalore|bengaluru|gurgaon|gurugram|pune|jaipur/i.test(text)) alerts.push("⚠️ Zone Alert: Unlaunched city mentioned (Live only in Noida, Greater Noida, GNW 201301 & Ghaziabad).");
  if (/satyanarayan|rudrabhishek/i.test(text) && !/utensil|thali|katori|parat|bhagona|vastra/i.test(text)) {
    alerts.push("💡 Puja Reminder: Ensure customer-owned household utensils were communicated.");
  }

  const gaps = detectMissingOutcome(text);
  const activeCategories = Object.keys(buckets).filter(k => buckets[k].length > 0);
  const splitSummary = activeCategories.map(k => `[${k}] ${buckets[k].join(" ")}`).join(" | ");
  return { buckets, activeCategories, splitSummary, alerts, gaps };
}