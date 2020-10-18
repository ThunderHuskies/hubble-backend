const language = require("@google-cloud/language");
const axios = require("axios");

const client = new language.LanguageServiceClient();

exports.analyzeEntities = async (text) => {
  try {
    // Detects the sentiment of the text
    console.log(text);
    const response = await axios.post(
      "https://language.googleapis.com/v1beta2/documents:analyzeEntities?key=" +
        process.env.GOOGLE_API_KEY,
      {
        document: {
          content: text,
          type: "PLAIN_TEXT",
        },
      }
    );
    return response.data.entities;
  } catch (error) {
    console.log(error.message);
  }
};
