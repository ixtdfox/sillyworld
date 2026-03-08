export const PHONE_UI_TEXTURE_SIZE = Object.freeze({ width: 1536, height: 1024 });

export const PHONE_UI_ATLAS = Object.freeze({
  phoneFrame: { x: 978, y: 0, width: 558, height: 950 },
  menuButtons: {
    map: {
      normal: { x: 0, y: 0, width: 128, height: 76 },
      pressed: { x: 129, y: 0, width: 128, height: 76 }
    },
    inv: {
      normal: { x: 0, y: 78, width: 128, height: 76 },
      pressed: { x: 129, y: 78, width: 128, height: 76 }
    },
    log: {
      normal: { x: 0, y: 156, width: 128, height: 76 },
      pressed: { x: 129, y: 156, width: 128, height: 76 }
    },
    msg: {
      normal: { x: 0, y: 234, width: 128, height: 76 },
      pressed: { x: 129, y: 234, width: 128, height: 76 }
    }
  },
  statusStrip: {
    moneyTime: { x: 0, y: 313, width: 500, height: 74 },
    locSig: { x: 0, y: 390, width: 500, height: 74 }
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

