const PREFIX = '[SillyRPG]';

function getContext() {
  return (
    window.SillyTavern?.getContext?.() ||
    window.getContext?.() ||
    window.SillyTavern?.context ||
    null
  );
}

export function notify(text, type = 'info') {
  try {
    if (window.toastr?.[type]) {
      window.toastr[type](text);
      return;
    }
    if (window.toastr?.info) {
      window.toastr.info(text);
      return;
    }
  } catch (error) {
    console.debug(PREFIX, 'toastr notify failed', error);
  }

  console.debug(PREFIX, `${type}: ${text}`);
}

export function findCharacterByName(name) {
  const context = getContext();
  if (!context || !name) return null;

  const candidates = [
    ...(Array.isArray(context.characters) ? context.characters : []),
    ...(Array.isArray(context.characterList) ? context.characterList : [])
  ];

  const norm = String(name).trim().toLowerCase();
  return candidates.find((char) => {
    const charName = String(char?.name || char?.char_name || '').trim().toLowerCase();
    return charName === norm;
  }) || null;
}

export async function openChatWithCharacter(character) {
  const context = getContext();
  if (!context || !character) return false;

  const index =
    character.avatar && Array.isArray(context.characters)
      ? context.characters.findIndex((item) => item?.avatar === character.avatar)
      : -1;

  try {
    if (typeof context.openChat === 'function') {
      await context.openChat(character);
      return true;
    }

    if (typeof context.selectCharacterById === 'function' && character.id) {
      await context.selectCharacterById(character.id);
      return true;
    }

    if (typeof context.setCharacterId === 'function' && character.id) {
      await context.setCharacterId(character.id);
      return true;
    }

    if (typeof context.setCharacterIndex === 'function' && index >= 0) {
      await context.setCharacterIndex(index);
      return true;
    }
  } catch (error) {
    console.debug(PREFIX, 'open chat failed', error);
  }

  return false;
}

export function appendContextToChat(ctx) {
  const context = getContext();
  if (!context || !ctx) return false;

  const note = `SillyRPG context: ${ctx.cityName || '?'} / ${ctx.districtName || '?'} / ${ctx.locationName || '?'}`;

  try {
    if (typeof context.addOneMessage === 'function') {
      context.addOneMessage({ name: 'System', is_user: false, mes: note });
      return true;
    }

    if (typeof context.sendSystemMessage === 'function') {
      context.sendSystemMessage(note);
      return true;
    }
  } catch (error) {
    console.debug(PREFIX, 'append context failed', error);
  }

  return false;
}
