export const SCHEMA_VERSION = 2;

export const TIME_OF_DAY = Object.freeze({
  Morning: 'Morning',
  Day: 'Day',
  Evening: 'Evening',
  Night: 'Night'
});

export const TIME_OF_DAY_ORDER = Object.freeze([
  TIME_OF_DAY.Morning,
  TIME_OF_DAY.Day,
  TIME_OF_DAY.Evening,
  TIME_OF_DAY.Night
]);

export const MAP_LEVEL = Object.freeze({
  Global: 'global',
  Region: 'region',
  City: 'city',
  District: 'district',
  Building: 'building',
  Room: 'room'
});

export const EQUIPMENT_SLOT = Object.freeze({
  Head: 'head',
  Body: 'body',
  Legs: 'legs',
  Feet: 'feet',
  LeftHand: 'leftHand',
  RightHand: 'rightHand',
  Backpack: 'backpack'
});
