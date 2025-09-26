// intelligence/linguistic_core/dictionaries/concepts.js

// يربط الكلمات العامية بالمفاهيم النفسية الأساسية.
export const CONCEPT_MAP = {
  "حزن": "sadness",
  "حزين": "sadness",
  "مكتئب": "sadness",
  "مخنوق": "sadness",
  "يأس": "sadness",
  "قلق": "anxiety",
  "قلقان": "anxiety",
  "خايف": "anxiety",
  "خوف": "anxiety",
  "متوتر": "anxiety",
  "طاقة": "helplessness", // فقدان الطاقة هو أحد مظاهر قلة الحيلة
  "شغف": "passion_loss",
  // ... سيتم توسيع هذا القاموس بشكل كبير لاحقًا
};
```

**ب. `stop_words.js` (الكلمات الشائعة)**
```javascript
// intelligence/linguistic_core/dictionaries/stop_words.js

// قائمة بالكلمات الشائعة التي لا تحمل معنى دلالي قوي ليتم تجاهلها.
export const STOP_WORDS = [
    "في", "من", "على", "مع", "أنا", "انا", "إني", "هو", "هي",
    "ما", "لم", "لا", "إن", "ان", "أن", "أو", "لكن", "و", "ال",
    "يا", "جدا", "جداً", "اوي", "أوي", "عندي", "بس", "ده", "دي",
    "كل", "كان", "يكون", "فيه"
];
