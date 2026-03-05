import { appendContextToChat, findCharacterByName, notify, openChatWithCharacter } from './stApi.js';

export async function openNpcChat(npc, context) {
  const targetName = npc?.stCharacterName || npc?.name;
  if (!targetName) {
    notify('NPC has no mapped SillyTavern character name.', 'warning');
    return;
  }

  const character = findCharacterByName(targetName);

  if (!character) {
    notify(`Create character named "${targetName}" or map this NPC.`, 'warning');
    console.debug('[SillyRPG]', 'character not found', { npc, context });
    return;
  }

  const opened = await openChatWithCharacter(character);
  if (!opened) {
    notify(`Could not open chat for "${targetName}" with current API surface.`, 'warning');
    console.debug('[SillyRPG]', 'open chat unsupported', { character });
    return;
  }

  appendContextToChat(context);
  notify(`Opened chat with ${targetName}.`, 'success');
}
