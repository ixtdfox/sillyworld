function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createInventoryScrollbar({
  GUI,
  viewportHeight,
  top,
  left,
  width,
  maxScroll,
  onScroll
}) {
  const slider = new GUI.Slider('inventory-scrollbar');
  slider.minimum = 0;
  slider.maximum = Math.max(0, maxScroll);
  slider.value = 0;
  slider.width = `${width}px`;
  slider.height = `${viewportHeight}px`;
  slider.left = `${left}px`;
  slider.top = `${top}px`;
  slider.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  slider.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  slider.isVertical = true;
  slider.background = '#2B2F36';
  slider.color = '#A8B0BD';
  slider.borderColor = '#0F1114';
  slider.thumbColor = '#D1D7DF';
  slider.barOffset = 0;
  slider.thickness = 1;
  slider.isPointerBlocker = true;
  slider.zIndex = 55;

  const setValue = (nextValue) => {
    const value = clamp(nextValue, 0, slider.maximum);
    if (Math.abs(slider.value - value) > 0.01) {
      slider.value = value;
      return;
    }
    onScroll(value);
  };

  slider.onValueChangedObservable.add((value) => {
    onScroll(value);
  });

  return {
    control: slider,
    setValue,
    getValue: () => slider.value,
    max: () => slider.maximum
  };
}
