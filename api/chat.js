// chat.js - FINAL DEPLOYMENT TEST

// We only need the response object for this test.
export default async function handler(req, res) {
  
  // This is a hardcoded response to test if new deployments are working at all.
  const testResponse = {
    reply: "هذا هو الاختبار النهائي. إذا رأيت هذه الرسالة، فهذا يعني أن النشر الجديد يعمل.",
    source: "final_deployment_test",
    userId: req.body.userId || "test_user",
    metadata: {
      timestamp: new Date().toISOString()
    }
  };

  console.log("--- FINAL DEPLOYMENT TEST: Handler was successfully executed. ---");

  return res.status(200).json(testResponse);
}
