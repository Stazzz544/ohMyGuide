const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const APK_PATH = path.join(PROJECT_ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'oh-my-guide.apk');
const ENV_PATH = path.join(PROJECT_ROOT, '.env.local');
// Сессия бота: без неё каждая загрузка — новый вход, а частые входы Telegram ограничивает
const SESSION_PATH = path.join(PROJECT_ROOT, '.telegram-session');
const REQUIRED_KEYS = ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID'];

const log = (message) => console.log(`[upload-apk] ${message}`);

const fail = (message) => {
  console.error(`\n[upload-apk] ${message}`);
  process.exit(1);
};

const readEnvFile = () => {
  if (!fs.existsSync(ENV_PATH)) {
    return {};
  }
  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')]),
  );
};

const config = { ...readEnvFile(), ...process.env };

const git = (...args) => {
  const result = spawnSync('git', args, { cwd: PROJECT_ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
};

// Bot API отдаёт id канала из последних сообщений в нём: по ссылке-приглашению бот канал не найдёт
const findChannels = async () => {
  if (!config.TELEGRAM_BOT_TOKEN) {
    fail('Сначала укажите TELEGRAM_BOT_TOKEN в .env.local');
  }
  const response = await fetch(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/getUpdates`);
  const data = await response.json();
  if (!data.ok) {
    fail(`Telegram ответил ошибкой: ${data.description}`);
  }
  const channels = new Map(
    data.result
      .map((update) => (update.channel_post ?? update.my_chat_member)?.chat)
      .filter((chat) => chat?.type === 'channel')
      .map((chat) => [chat.id, chat.title]),
  );
  if (channels.size === 0) {
    fail('Каналов не найдено. Добавьте бота администратором канала, опубликуйте в канале любое сообщение и повторите');
  }
  channels.forEach((title, id) => log(`${title}: TELEGRAM_CHANNEL_ID=${id}`));
};

const uploadApk = async () => {
  const missingKeys = REQUIRED_KEYS.filter((key) => !config[key]);
  if (missingKeys.length > 0) {
    log(`Отправка в Telegram пропущена: в .env.local нет ${missingKeys.join(', ')}. Настройка — LOCAL_BUILD.md`);
    return;
  }
  if (!fs.existsSync(APK_PATH)) {
    fail(`APK не найден: ${APK_PATH}. Сначала соберите его: npm run build:apk`);
  }

  if (!fs.existsSync(path.join(PROJECT_ROOT, 'node_modules', 'telegram'))) {
    fail('Не установлен пакет telegram: выполните npm install --save-dev telegram');
  }
  const { TelegramClient } = require('telegram');
  const { StringSession } = require('telegram/sessions');
  const { CustomFile } = require('telegram/client/uploads');

  const version = require(path.join(PROJECT_ROOT, 'package.json')).version;
  const commit = git('rev-parse', '--short', 'HEAD');
  const isDirty = git('status', '--porcelain', '--untracked-files=no') !== '';
  const builtAt = fs.statSync(APK_PATH).mtime.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  const caption = [
    `OhMyGuide ${version}`,
    `${git('rev-parse', '--abbrev-ref', 'HEAD')} · ${commit}${isDirty ? ' + незакоммиченные правки' : ''}`,
    git('log', '-1', '--format=%s'),
    `Сборка: ${builtAt}`,
  ].join('\n');
  const size = fs.statSync(APK_PATH).size;

  const session = fs.existsSync(SESSION_PATH) ? fs.readFileSync(SESSION_PATH, 'utf8').trim() : '';
  const client = new TelegramClient(new StringSession(session), Number(config.TELEGRAM_API_ID), config.TELEGRAM_API_HASH, {
    connectionRetries: 5,
  });
  client.setLogLevel('error');

  try {
    await client.start({ botAuthToken: config.TELEGRAM_BOT_TOKEN });
    fs.writeFileSync(SESSION_PATH, client.session.save());

    log(`Отправляю ${(size / 1024 / 1024).toFixed(1)} МБ в канал…`);
    let reportedPercent = 0;
    await client.sendFile(Number(config.TELEGRAM_CHANNEL_ID), {
      file: new CustomFile(`oh-my-guide-${version}-${commit}.apk`, size, APK_PATH),
      caption,
      forceDocument: true,
      workers: 4,
      progressCallback: (progress) => {
        const percent = Math.floor(progress * 10) * 10;
        if (percent > reportedPercent) {
          reportedPercent = percent;
          log(`${percent}%`);
        }
      },
    });
    log('Готово: APK в канале');
  } finally {
    await client.destroy();
  }
};

const task = process.argv.includes('--find-channel') ? findChannels : uploadApk;

task()
  .then(() => process.exit(0))
  .catch((error) => fail(`Не удалось отправить APK в Telegram: ${error.message ?? error}`));
