
#ifndef BarGraph_h
#define BarGraph_h

#include "Arduino.h"
class BarGraph
{
public:
  BarGraph();
  void setStartPin(int startPin);
  void light(boolean reverse);
  void light();
  void setValue(int value);
private:
  int _startPin;
  int _commons[12];
  int _pins[12];
  int _value;
  int _currIndex;

};

#endif


