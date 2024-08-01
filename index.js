const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path'); 
const multer = require('multer');
const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { storage, database } = require('./config');
const { ref: dbRef, set } = require("firebase/database");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);


const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/sound_effects', express.static(path.join(__dirname, 'sound_effects')));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


app.post('/extract-sfx', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const prompt = `I need you to identify parts from the following passage that I can use to create SFX sounds with. Only include the part that I can use to create the SFX sound in a list.\n\n${text}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('Unexpected API response format');
    }

    const phrases = response.choices[0].message.content.trim().split('\n');
    const filteredPhrases = phrases.filter(phrase => phrase.length > 0);

    res.json({ phrases: filteredPhrases });
  } catch (error) {
    console.error('Error in /extract-sfx:', error);
    if (error.response) {
      console.error('OpenAI API response:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to extract SFX phrases: ' + error.message });
  }
});

// to Upload pdf file 
const storageMulter = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storageMulter });



app.post('/save-sound-effects', async (req, res) => {
  const { phrases } = req.body;
  
  if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
    return res.status(400).json({ error: 'Phrases are required' });
  }

  try {
    const soundEffectPromises = phrases.map(async (phrase) => {
      try {
        // Call external API to generate sound effects
        const response = await axios.post('https://pythonapi-cozl.onrender.com/generate_sound_effects', {
          phrases: [phrase],
          duration_seconds: 10,
          prompt_influence: 0.3,
        }, {
          responseType: 'arraybuffer'
        });

        // Convert response data to a Buffer
        const audioBuffer = Buffer.from(response.data, 'binary');
        const storageRef = ref(storage, `sound_effects/${phrase}.mp3`);

        // Upload the audio file to Firebase Storage
        await uploadBytes(storageRef, audioBuffer);

        // Get the download URL of the uploaded file
        const downloadURL = await getDownloadURL(storageRef);

        // Store metadata in Firebase Realtime Database
        const newSoundEffect = {
          phrase: phrase,
          downloadURL: downloadURL,
          createdAt: new Date().toISOString(),
        };

        const soundEffectRef = dbRef(database, 'soundEffects/' + phrase);
        await set(soundEffectRef, newSoundEffect);

        return { phrase, downloadURL };
      } catch (err) {
        console.error(`Error processing phrase "${phrase}":`, err.message);
        throw err; // Re-throw to be caught by Promise.all
      }
    });

    const results = await Promise.all(soundEffectPromises);
    res.json({ results });

  } catch (error) {
    console.error('Error in /save-sound-effects:', error.message);
    res.status(500).json({ error: 'Failed to save sound effects: ' + error.message });
  }
});


app.post('/transcribe-audio', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  try {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    const transcription = {
      transcription: response.text,
      timestamps: response.words,
    };

    res.json({  transcription });
  } catch (error) {
    console.error('Error in /transcribe-audio:', error);
    if (error.response) {
      console.error('OpenAI API response:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to transcribe audio: ' + error.message });
  } finally {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});