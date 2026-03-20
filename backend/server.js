import express from 'express';
import cors from 'cors';
import Kahoot from 'kahoot.js-latest';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const POLISH_NAMES = [
  "Kacper", "Jakub", "Julia", "Maja", "Zuzanna", "Jan", "Szymon", 
  "Oliwier", "Antoni", "Filip", "Amelia", "Lena", "Mateusz", 
  "Bartosz", "Wiktoria", "Oliwia", "Zofia", "Michał", "Piotr", "Natalia",
  "Tomek", "Kamil", "Karolina", "Martyna", "Wojtek", "Adam"
];

function getRandomName() {
  return POLISH_NAMES[Math.floor(Math.random() * POLISH_NAMES.length)];
}

const activeBots = new Map();

// Helper to fetch Kahoot Quiz data
async function fetchQuizData(link) {
  if (!link) return null;
  const uuidMatch = link.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (!uuidMatch) return null;

  try {
    const uuid = uuidMatch[0];
    const response = await axios.get(`https://create.kahoot.it/rest/kahoots/${uuid}`);
    return response.data; // contains .questions array
  } catch (error) {
    console.error("Błąd pobierania quizu:", error.message);
    return null;
  }
}

app.post('/api/joingame', async (req, res) => {
  try {
    const { pin, name, count, useBypass, answerMode, quizLink } = req.body;
    
    if (!pin) {
      return res.status(400).json({ error: "PIN is required." });
    }

    // Try to pre-fetch the quiz data if a link is provided
    let quizData = null;
    if (answerMode === 'always-right' || answerMode === 'always-wrong') {
      quizData = await fetchQuizData(quizLink);
    }

    const numBots = Math.min(parseInt(count) || 1, 100);
    const joinPromises = [];
    const isRandomNames = !name || name.trim() === "";

    for (let i = 0; i < numBots; i++) {
            // Using any as a workaround for typing if needed, but the library works
      const client = new Kahoot();
      
      let botName = "";
      
      if (isRandomNames) {
        botName = `${getRandomName()}${Math.floor(Math.random() * 999)}`;
      } else {
        if (useBypass) {
          const invisibleSpaces = '\u200B'.repeat(i);
          botName = `${name}${invisibleSpaces}`;
        } else {
          botName = numBots > 1 ? `${name}${i + 1}` : name;
        }
      }
      
      const joinPromise = new Promise((resolve) => {
        client.join(pin, botName).then(() => {
          console.log(`Bot ${botName} dołączył do PIN ${pin} (Mode: ${answerMode})`);
          
          if (answerMode && answerMode !== 'none') {
            client.on("QuestionStart", (question) => {
              
              setTimeout(() => {
                try {
                  let answerIndex = 0;
                  const numChoices = question.numberOfChoices || 4;
                  
                  // Question Index sent by Kahoot
                  const qIndex = question.index;

                  if (answerMode === 'random') {
                    answerIndex = Math.floor(Math.random() * numChoices);
                  } else if (answerMode === 'always-right') {
                    // Try to find the correct answer in the downloaded quiz data
                    if (quizData && quizData.questions && quizData.questions[qIndex]) {
                      const choices = quizData.questions[qIndex].choices;
                      const correctChoice = choices.findIndex(c => c.correct);
                      if (correctChoice !== -1) {
                        answerIndex = correctChoice;
                      } else {
                         // fallback
                         answerIndex = Math.floor(Math.random() * numChoices);
                      }
                    } else {
                      // No quiz data, fallback
                      answerIndex = Math.floor(Math.random() * numChoices);
                    }
                  } else if (answerMode === 'always-wrong') {
                     // Try to find a wrong answer in the downloaded quiz data
                     if (quizData && quizData.questions && quizData.questions[qIndex]) {
                        const choices = quizData.questions[qIndex].choices;
                        const wrongChoice = choices.findIndex(c => !c.correct);
                        if (wrongChoice !== -1) {
                          answerIndex = wrongChoice;
                        } else {
                           answerIndex = 0;
                        }
                      } else {
                        // No quiz data, fallback
                        answerIndex = Math.floor(Math.random() * numChoices);
                      }
                  }
                  
                  question.answer(answerIndex);
                  console.log(`Bot ${botName} odpowiedział: ${answerIndex} (Na pyt: ${qIndex})`);
                } catch (e) {
                  console.error(e);
                }
              }, 1000 + Math.random() * 4000); 
            });
            
            client.on("Disconnect", (reason) => {
               console.log(`Bot ${botName} rozłączony: ${reason}`);
               activeBots.delete(client);
            });
          }

          activeBots.set(client, botName);
          resolve({ success: true, name: botName });
        }).catch((err) => {
          console.error(`Bot ${botName} failed:`, err);
          resolve({ success: false, name: botName, error: err.description || err.message || "Failed" });
        });
      });
      
      joinPromises.push(joinPromise);
      await new Promise(r => setTimeout(r, 150)); 
    }

    const results = await Promise.all(joinPromises);
    
    return res.json({
      message: `Wysłano ${results.filter(r => r.success).length} botów. ${quizData ? '(Baza pobrana pomyślnie)' : ''}`,
      results: results
    });

  } catch (error) {
    console.error("Function error:", error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KahSpam Backend running on port ${PORT}`);
});
