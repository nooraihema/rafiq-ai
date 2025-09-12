

const fs = require("fs");
const path = "./intents";

fs.readdirSync(path).forEach(f => {
  const fullPath = path + "/" + f;
  const raw = fs.readFileSync(fullPath, "utf8");
  let data;
  try { 
    data = JSON.parse(raw); 
  } catch { 
    console.log("خطأ في JSON:", f); 
    return; 
  }
  if (!Array.isArray(data)) {
    fs.writeFileSync(fullPath, JSON.stringify([data], null, 2));
  }
});

console.log("✅ تم تعديل الملفات الغير مصفوفة تلقائياً");


