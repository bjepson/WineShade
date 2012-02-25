#include "Arduino.h"
#include "BarGraph.h"

BarGraph::BarGraph() {
  _value = 0;
  _currIndex = 0;
}

void BarGraph::setStartPin(int startPin)
{

  for (int i = 0; i < 12; i++) {
    _commons[i] = startPin + i/4;
    _pins[i] = startPin + 3 + i % 4;

    pinMode(_commons[i], OUTPUT);
    digitalWrite(_commons[i], LOW);

    pinMode(_pins[i], OUTPUT);
    digitalWrite(_pins[i], HIGH);
  }
}

void BarGraph::setValue(int value) {
  _value = value;
}

void BarGraph::light(boolean reverse) {

  if ( (reverse  && 11 - _currIndex <= _value - 1) ||
    (!reverse && _currIndex <= _value - 1))
  {

    digitalWrite(_commons[_currIndex], HIGH);
    digitalWrite(_pins[_currIndex], LOW);

    delay(1);

    digitalWrite(_commons[_currIndex], LOW);
    digitalWrite(_pins[_currIndex], HIGH);

  }

  _currIndex++;
  _currIndex %= 12;

}

void BarGraph::light() {
  light(false);
}

