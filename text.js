const { initializeApp } = require("firebase/app");
const { getStorage, ref, listAll, getDownloadURL } = require("firebase/storage");
const fs = require("fs").promises;
const path = require("path");
const fetch = require("node-fetch");
const OpenAI = require("openai");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const player = require("play-sound")();

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Initialize Firebase (use your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBq1WKVeejEwilfUFxYj0nQBEDqndoKWY8",
  authDomain: "fir-b4325.firebaseapp.com",
  projectId: "fir-b4325",
  storageBucket: "fir-b4325.appspot.com",
  messagingSenderId: "470772458585",
  appId: "1:470772458585:web:d42152df5d32e118e9bd48",
  measurementId: "G-Y3RB3WR9GB"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function downloadAllSFX(localDir) {
  const sfxDir = ref(storage, 'sound_effects');
  const sfxList = await listAll(sfxDir);
  const phrases = [];

  await Promise.all(sfxList.items.map(async (itemRef) => {
    const url = await getDownloadURL(itemRef);
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const localPath = path.join(localDir, itemRef.name);
    await fs.writeFile(localPath, Buffer.from(buffer));
    console.log(`Downloaded SFX to ${localPath}`);
    phrases.push(path.basename(localPath, path.extname(localPath)));
  }));

  return phrases;
}

async function generateTTS(inputText, localPath) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: inputText,
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.writeFile(localPath, buffer);
  console.log(`Generated TTS to ${localPath}`);
}

async function getTimestamps(audioPath, phrases) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const transcription = await openai.audio.transcriptions.create({
    file: await fs.readFile(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"]
  });
  const timestamps = {};
  transcription.words.forEach(word => {
    phrases.forEach(phrase => {
      if (word.word.toLowerCase().includes(phrase.toLowerCase())) {
        if (!timestamps[phrase]) {
          timestamps[phrase] = { start: word.start, end: word.end };
        } else {
          timestamps[phrase].end = word.end;
        }
      }
    });
  });
  return timestamps;
}

async function combineAudioWithSFX(ttsPath, sfxDir, outputPath, timestamps) {
  return new Promise((resolve, reject) => {
    const ffmpegCmd = ffmpeg().input(ttsPath);
    let filterComplex = '';
    let inputIndex = 1;

    Object.entries(timestamps).forEach(([phrase, time]) => {
      const sfxPath = path.join(sfxDir, `${phrase}.mp3`);
      if (fs.existsSync(sfxPath)) {
        ffmpegCmd.input(sfxPath);
        filterComplex += `[${inputIndex}:a]atrim=start=${time.start}:end=${time.end},asetpts=PTS-STARTPTS[sfx${inputIndex}];`;
        inputIndex++;
      }
    });

    if (inputIndex > 1) {
      filterComplex += `[0:a]`;
      for (let i = 1; i < inputIndex; i++) {
        filterComplex += `[sfx${i}]`;
      }
      filterComplex += `amix=inputs=${inputIndex}:duration=longest`;
      ffmpegCmd.complexFilter(filterComplex);
    }

    ffmpegCmd.output(outputPath)
      .on('end', () => {
        console.log(`Combined audio saved to ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`Error combining audio: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

const sfxLocalDir = path.resolve("./sfx");
const ttsLocalPath = path.resolve("./tts.mp3");
const combinedLocalPath = path.resolve("./combined.mp3");
const inputText = "The crown jewel caper bird Buddy the Golden Retriever and Max the Beagle were the best of friends. They lived in a cosy cottage at the edge of the Whispering Woods, a magical forest filled with secrets and wonder. One sunny morning, as they were playing fetch in their garden, a sparkling butterfly fluttered by, leaving a trail of glittering dust in its wake. Look, Buddy! Max exclaimed, his tail wagging excitedly. Let's follow it! Buddy, always up for an adventure, agreed. As they chased after the butterfly, they found themselves deeper in the Whispering Woods than they had ever been before. Suddenly, they heard a commotion coming from a nearby clearing. Peeking through the bushes, they saw a group of woodland creatures gathered around a distraught fairy princess. Oh, what shall we do? she cried. The crown jewels have been stolen, and without them, our kingdom will lose its magic. Buddy and Max looked at each other, their eyes gleaming with determination. They knew they had to help. Your highness, Buddy said, stepping forward. We'd be honored to help find your crown jewels. The fairy princess's face lit up. Oh, thank you! The thief left a trail of purple feathers. Please, bring back the jewels before sunset, or our kingdom will fade away. With no time to lose, Buddy and Max set off on their quest. Buddy used his excellent tracking skills to follow the feather trail, while Max's keen nose picked up the scent of magic in the air. As they ventured deeper into the forest, they encountered all sorts of magical creatures. A wise old owl gave them directions, a mischievous group of pixies tried to lead them astray, and a friendly unicorn offered them a ride across a sparkling river. Finally, they reached a dark cave at the base of a twisted tree. The trail ends here, Buddy whispered. And the magic smell is strong, Max added, his nose twitching. Cautiously, they entered the cave. Inside, they found a grumpy old troll surrounded by piles of shiny treasures, including the crown jewels. Who dares enter my cave, the troll growled. Buddy, being the brave one, stepped forward. We've come for the crown jewels, the fairy kingdom needs them. The troll huffed. I found them fair and square, finders keepers. Max, always the clever one, had an idea. How about a trade? These jewels might be pretty, but they're not as fun as a good game of fetch. The troll's eyes widened with interest. Fetch? What's that? Buddy and Max spent the next hour teaching the troll how to play fetch with a shiny rock. The troll had so much fun that he forgot all about the jewels. You know what? The troll said, grinning. You can have those old jewels, this game is much more fun. Overjoyed, Buddy and Max thanked the troll and rushed back to the fairy princess, ease the crown jewels secure in Buddy's mouth. They reached the clearing just as the sun was setting. The fairy princess was overjoyed to see them. You did it! She exclaimed, placing the jewels back in their rightful place. Instantly, the forest came alive with magic, flowers bloomed, trees swayed with joy, and all the woodland creatures cheered for Buddy and Max. As a reward for their bravery, the fairy princess granted Buddy and Max the ability to talk to all the animals in the Whispering Woods. From that day on, they had many more magical adventures with their new friends, always ready to lend a helping paw whenever needed.";

(async () => {
  try {
    await fs.mkdir(sfxLocalDir, { recursive: true });
    const phrasesToTimestamp = await downloadAllSFX(sfxLocalDir);
    await generateTTS(inputText, ttsLocalPath);
    const timestamps = await getTimestamps(ttsLocalPath, phrasesToTimestamp);
    await combineAudioWithSFX(ttsLocalPath, sfxLocalDir, combinedLocalPath, timestamps);
    player.play(combinedLocalPath, (err) => {
      if (err) {
        console.error(`Error playing audio: ${err.message}`);
      } else {
        console.log('Audio playback finished.');
      }
    });
  } catch (error) {
    console.error(`Error in processing: ${error.message}`);
  }
})();
