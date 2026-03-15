export interface AtlasRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PHONE_UI_TEXTURE_SIZE = Object.freeze({ width: 1536, height: 1024 });

export const PHONE_UI_ATLAS = Object.freeze({
  phoneFrame: { x: 978, y: 0, width: 555, height: 918 },
  menuButtons: {
    map: {
      normal: { x: 0, y: 0, width: 166, height: 93 },
      pressed: { x: 172, y: 0, width: 166, height: 93 }
    },
    inv: {
      normal: { x: 0, y: 93, width: 166, height: 93 },
      pressed: { x: 172, y: 93, width: 166, height: 93 }
    },
    log: {
      normal: { x: 0, y: 186, width: 166, height: 93 },
      pressed: { x: 172, y: 186, width: 166, height: 93 }
    },
    msg: {
      normal: { x: 0, y: 279, width: 166, height: 93 },
      pressed: { x: 172, y: 279, width: 166, height: 93 }
    }
  },
  statusStrip: {
    moneyTime: { x: 0, y: 373, width: 478, height: 81 },
    locSig: { x: 0, y: 448, width: 496, height: 81 }
  },
  callButtons: {
    green: {
      normal: { x: 0, y: 705, width: 312, height: 159 },
      pressed: { x: 315, y: 705, width: 312, height: 159 }
    },
    red: {
      normal: { x: 0, y: 867, width: 312, height: 156 },
      pressed: { x: 315, y: 867, width: 312, height: 156 }
    }
  }
});
