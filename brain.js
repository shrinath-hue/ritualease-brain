// Paste your deployed Google Apps Script Web App URL (/exec) below once so ALL devices work automatically without setup!
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/library/d/1CvOhnioxK0zj0XQ3PLsy9tGqNkOcyUCqGfUe_avkos-p7AI1WfMF-31R/5";

function getScriptUrl() {
  return (localStorage.getItem("re_script_url") || DEFAULT_SCRIPT_URL).trim();
}

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

function detectMissingOutcome(text) {
  const gaps = [];
  if (/quoted|quote|lead|enquir|inquiry|call|called|messaged|whatsapp|asked/i.test(text) &&
      !/booked|confirmed|advance|paid|closed|lost|not interested|declined|scheduled|follow.?up on|next call|tomorrow|date/i.test(text)) {
    gaps.push("Missing lead outcome or next follow-up date");
  }
  if (/issued|took|picked up|pamphlet|blinkit|school|society|mall|temple/i.test(text) &&
      !/returned|remaining|left|0 missing|reconciled|balance/i.test(text)) {
    gaps.push("Missing pamphlet return/remaining count");
  }
  if (/vendor|cake|baker|pandit|samagri|decor|catering|suraj|kapil|mm cakes|pizzado|sarita|mangal/i.test(text) &&
      !/confirmed|locked|paid|advance|dispatched|delivered|₹|rs/i.test(text)) {
    gaps.push("Missing vendor rate or confirmation status");
  }
  return gaps;
}

function smartSplitLocal(text) {
  const sentences = text.split(/(?<=[.!?\n])\s+/).map(s => s.trim()).filter(Boolean);
  const buckets = {
    "Field & Pamphlets": [],
    "Sales & WhatsApp Leads": [],
    "Supply Chain & Vendors": [],
    "Marketing & Brand": [],
    "General Notes": []
  };
  getCustomRules().forEach(r => { if (!buckets[r.section]) buckets[r.section] = []; });

  sentences.forEach(s => {
    let matched = false;
    getCustomRules().forEach(r => {
      const kws = r.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
      if (kws.some(kw => s.toLowerCase().includes(kw))) {
        buckets[r.section].push(s); matched = true;
      }
    });
    if (/pamphlet|blinkit|school|society|mall|temple|distributed|returned|issued|qr|rider/i.test(s)) {
      buckets["Field & Pamphlets"].push(s); matched = true;
    }
    if (/lead|quote|quoted|customer|booked|booking|satyanarayan|rudrabhishek|grah pravesh|birthday|anniversary|whatsapp|utensil|thali|parat/i.test(s)) {
      buckets["Sales & WhatsApp Leads"].push(s); matched = true;
    }
    if (/vendor|cake|baker|pandit|samagri|suraj|kapil|sg events|mm cakes|bento|modi|pizzado|desi haandi|sarita|mangal|haldiram|cute store|sumit|akash|vikas|rate/i.test(s)) {
      buckets["Supply Chain & Vendors"].push(s); matched = true;
    }
    if (/meta|ad|reel|instagram|post|caption|flyer|creative|spend|cpl|mygate|nobrokerhood/i.test(s)) {
      buckets["Marketing & Brand"].push(s); matched = true;
    }
    if (!matched) buckets["General Notes"].push(s);
  });

  const activeCategories = Object.keys(buckets).filter(k => buckets[k].length > 0);
  const splitSummary = activeCategories.map(k => `• ${k}: ${buckets[k].join(" ")}`).join("\n");
  return { buckets, activeCategories, splitSummary, gaps: detectMissingOutcome(text) };
}
