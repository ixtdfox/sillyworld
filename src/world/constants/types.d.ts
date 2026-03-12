export const SCHEMA_VERSION: 4;

export const TIME_PHASE: Readonly<{
  Morning: 'morning';
  Day: 'day';
  Evening: 'evening';
  Night: 'night';
}>;
export type TimePhase = (typeof TIME_PHASE)[keyof typeof TIME_PHASE];

export const TIME_PHASE_ORDER: readonly TimePhase[];

export const TIME_OF_DAY: Readonly<{
  Morning: 'Morning';
  Day: 'Day';
  Evening: 'Evening';
  Night: 'Night';
}>;
export type TimeOfDay = (typeof TIME_OF_DAY)[keyof typeof TIME_OF_DAY];

export const TIME_OF_DAY_ORDER: readonly TimeOfDay[];

export const MAP_LEVEL: Readonly<{
  Global: 'global';
  Region: 'region';
  City: 'city';
  District: 'district';
  Building: 'building';
  Room: 'room';
}>;
export type MapLevel = (typeof MAP_LEVEL)[keyof typeof MAP_LEVEL];

export const EQUIPMENT_SLOT: Readonly<{
  Head: 'head';
  Body: 'body';
  Legs: 'legs';
  Feet: 'feet';
  LeftHand: 'leftHand';
  RightHand: 'rightHand';
  Backpack: 'backpack';
}>;
export type EquipmentSlot = (typeof EQUIPMENT_SLOT)[keyof typeof EQUIPMENT_SLOT];
