<p align="center">
  <img width="450" height="120" align="center" src=".github/logo.svg">
  <br>
  <div align="center">
    <img alt="Visitor Badge" src="https://api.visitorbadge.io/api/visitors?path=All-English.Razzmatazz&countColor=%23FF9900">
    <img src="https://img.shields.io/github/license/All-English/Razzmatazz?style=for-the-badge&color=FF9900" alt="License">
  </div>
</p>

## 🧩 What is this project?

**Razzmatazz** is a straightforward, open-source scrambled sentence builder game. It lets teachers and hosts run interactive, real-time multiplayer quizzes where players piece sentences back together chunk by chunk.

### 💡 The Backstory: Why Razzmatazz?
I teach English to students in Korea, and one of the biggest hurdles my students face is **sentence structure**. They know the vocabulary, but putting the words together in the correct order is a constant challenge. 

I was inspired by a feature in a popular language-learning app (you know, the one with the green owl!) where you see a translation and have to build the sentence in the target language. I wanted a way for my students to practice exactly that—but in a fun, interactive, multiplayer classroom environment. 

After searching for a good starting point, I found **Razzia** (a fantastic open-source quiz game) and decided to adapt and redesign it to fit this sentence-building pedagogy. Thus, Razzmatazz was born!

> [!NOTE]
> 🛠️ **Built with AI (Vibe Coded)**
> Just a heads up: This project was built with the help of AI pair-programming (aka vibe coding). It works wonderfully in the classroom and has a polished UI, but since I am an English teacher and not a professional developer, you might spot some "creative" code structures under the hood!

<p align="center">
  <img width="30%" src=".github/previews/1.png" alt="Login">
  <img width="30%" src=".github/previews/2.png" alt="Manager Dashboard">
  <br>
  <img width="30%" src=".github/previews/3.png" alt="Question Screen">
  <img width="30%" src=".github/previews/4.png" alt="Game Lobby">
</p>

## 🆚 Razzmatazz vs. Razzia

Razzmatazz is built on top of the open-source **Razzia** quiz platform (originally developed by [Ralex91](https://github.com/Ralex91/Razzia)). While it shares Razzia's robust real-time communication foundation, Razzmatazz has been heavily adapted and redesigned for language education.

Here are the key improvements and additions in Razzmatazz:

### 🧩 Core Gameplay & Formats
* **Scrambled Sentence Builder**: Instead of traditional multiple-choice questions, Razzmatazz is custom-built for language reconstruction. Players click or tap scrambled word chunks in sequence to build sentences.
* **Practice Mode**: A relaxed, untimed study configuration. Timer countdowns are lifted so students can build sentences at their own pace, checking answers as they go.
* **Versus Mode**: A competitive multiplayer game mode. Students race against each other in real-time to build sentences, tracking points and streaks.

### 🎛️ Redesigned Manager Experience
* **New Manager Dashboard**: A brand new, full-screen dashboard for quiz management.
* **Library Folders & Organization**: Easily sort quizzes by name, group them into folders, and toggle favorites.
* **Game Lobby**: A brand new, full-screen lobby for game management.
* **AI-Assisted Story Import**: Paste any paragraph or story, and use AI integration to automatically translate all sentences to generate translation prompts instantly.

### 📱 Player-Facing Polish
* **Slideshow Waiting Room**: Instead of a simple spinning loading circle, players waiting in the lobby see a smooth slideshow showing the quiz's sentences one by one so they can start previewing the material.
* **State Restoration**: Robust reconnection handling that preserves active game modes (e.g., Versus mode and Early End buttons) if the manager or player gets disconnected and rejoins mid-game.


## ⚙️ Prerequisites

Choose one of the following deployment methods:

### Without Docker

- Node.js : version 22 or higher
- PNPM : version 10.16 or higher (learn more [here](https://pnpm.io/))

### With Docker

- Docker and Docker Compose

## 📖 Getting Started

First, clone the repository and navigate into the project directory:

```bash
git clone https://github.com/All-English/Razzmatazz.git
cd ./Razzmatazz
```

Now, choose your preferred deployment method below:

### 🐳 Using Docker (Recommended)

To run the application with your latest local updates, you will need to build the Docker image locally.

Using Docker Compose (recommended):
You can find the docker compose configuration in the repository:
[compose.yml](/compose.yml)

```bash
docker compose up --build -d
```

Or using Docker directly:

```bash
# Build the image locally
docker build -t razzmatazz:latest .

# Run the container
docker run -d \
  --name razzmatazz \
  --restart unless-stopped \
  --init \
  -p 3050:3000 \
  -v "$(pwd)/config:/app/config" \
  razzmatazz:latest
```

**Configuration Volume:**
The `-v "$(pwd)/config:/app/config"` option mounts a local `config` folder to persist your game settings and quizzes. This allows you to:

- Edit your configuration files directly on your host machine
- Keep your settings when updating the container
- Easily backup your quizzes and game configuration

The folder will be created automatically on first run with an example quiz to get you started.

**PWA Deep-Linking Configuration (Optional):**
If you install Razzmatazz as a Progressive Web App (PWA) on your tablets or devices, you can configure it to automatically open direct links — such as when scanning a game lobby QR code with the device's native camera app — directly inside the installed PWA window, rather than a standard browser tab.

To enable this with Docker:
1. Set the `APP_DOMAIN` environment variable to your actual hosting domain. In `compose.yml`, find the `APP_DOMAIN` line and update it (e.g., `APP_DOMAIN=https://razzmatazz.myhomelab.net`), or pass it directly via `-e APP_DOMAIN=https://razzmatazz.myhomelab.net` in your `docker run` command. A local IP address also works (e.g., `http://192.168.1.100`).
2. **(Automatic)** That's it. The container automatically generates and serves the required verification file (`/.well-known/web-app-origin-association`) at startup. If you have a reverse proxy (e.g., Nginx Proxy Manager, Cloudflare Tunnels, Caddy) in front of the container, make sure it passes requests to `/.well-known/` through to the container — some proxies block dotfile paths by default.

The application will be available at http://localhost:3050

### 🛠️ Without Docker

1. Install dependencies:

```bash
pnpm install
```

2. Build and start the application:

```bash
# Development mode
pnpm run dev

# Production mode
pnpm run build
pnpm start
```

**PWA Deep-Linking Configuration (Optional):**
If you install Razzmatazz as a Progressive Web App (PWA) on your tablets or devices, you can configure it to automatically open direct links — such as when scanning a game lobby QR code with the device's native camera app — directly inside the installed PWA window, rather than a standard browser tab.

To enable this without Docker:
1. Set the `APP_DOMAIN` environment variable to your hosting domain **before running the build**, so it is embedded into the app at compile time:
   ```bash
   APP_DOMAIN=https://razzmatazz.myhomelab.net pnpm run build
   ```
   A local IP address also works (e.g., `APP_DOMAIN=http://192.168.1.100 pnpm run build`).
2. **(Manual)** Unlike the Docker setup, the verification file is **not** automatically regenerated at runtime. After building, locate `dist/web/.well-known/web-app-origin-association` and confirm that your domain appears correctly inside it before deploying.
3. Ensure your web server is configured to serve files from the `/.well-known/` path. Some servers block dotfile directories by default — check your Nginx, Apache, or Caddy configuration if the file is not publicly accessible.

## ⚙️ Configuration

The configuration is split into two main parts:

### 1. Game Configuration (`config/game.json`)

Main game settings:

```json
{
  "managerPassword": "PASSWORD"
}
```

Options:

- `managerPassword`: The master password for accessing the manager interface. **Must be changed from the default `"PASSWORD"` value**, otherwise manager access is blocked.

### 2. Quiz Configuration (`config/quizz/*.json`)

Quizzes can be created in two ways:

- **Via the Quiz Editor** — use the built-in editor available in the manager dashboard (recommended)
- **Via JSON files** — manually create files in the `config/quizz/` directory

You can have multiple quiz files and select which one to use when starting a game.

Example quiz configuration (`config/quizz/example.json`):

```json
{
  "subject": "Example Quiz",
  "questions": [
    {
      "prompt": "그것은 큰 가스 덩어리야.",
      "scrambledChunks": ["of gas.", "It", "a big ball", "is"],
      "correctChunks": ["It", "is", "a big ball", "of gas."],
      "correctSentence": "It is a big ball of gas.",
      "cooldown": 5,
      "time": 30
    },
    {
      "prompt": "나는 학교에 갑니다.",
      "scrambledChunks": ["go", "I", "school.", "to"],
      "correctChunks": ["I", "go", "to", "school."],
      "correctSentence": "I go to school.",
      "cooldown": 5,
      "time": 30
    },
    {
      "prompt": "그녀는 빨간 사과를 좋아해요.",
      "scrambledChunks": ["red apples.", "She", "likes"],
      "correctChunks": ["She", "likes", "red apples."],
      "correctSentence": "She likes red apples.",
      "media": {
        "type": "image",
        "url": "https://placehold.co/600x400.png"
      },
      "cooldown": 5,
      "time": 30
    }
  ]
}
```

Quiz Options:

- `subject`: Title/topic of the quiz
- `questions`: Array of question objects containing:
  - `prompt`: The prompt, clue, or translation shown to the players
  - `scrambledChunks`: Array of scrambled word/phrase chunks presented to players to build the sentence
  - `correctChunks`: Array of the chunks in the correct sequence
  - `correctSentence`: The full correct sentence reconstructed by the chunks
  - `media`: Optional media object displayed with the question:
    - `type`: `"image"`, `"video"`, or `"audio"`
    - `url`: URL of the media
  - `cooldown`: Time in seconds before players can start building the sentence (3-15)
  - `time`: Time in seconds allowed to build the sentence (5-120, or 9999 for Study Mode/no time limit)

## 🎮 How to Play

1. Access the manager interface at http://localhost:3050/manager (or http://localhost:3000/manager if running without Docker)
2. Enter the manager password (defined in `config/game.json`)
3. Share the game URL (http://localhost:3050 or http://localhost:3000) and room code with participants
4. Wait for players to join
5. Click the start button to begin the game

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=All-English/Razzmatazz&type=date&legend=bottom-right)](https://www.star-history.com/#All-English/Razzmatazz&type=date&legend=bottom-right)
