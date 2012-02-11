#include "BarGraph.h"

const int debounceDelay = 10;  // milliseconds to wait until stable
const int blinkDelay = 250;

int numButtons = 3;
int buttons[] = {
  47, 48, 49};
int leds[] = {
  50, 51, 52};
int counts[] = {
  0, 0, 0};

BarGraph *bargraphs[3];

int total = 0;

boolean debounce(int pin)
{
  boolean state;
  boolean previousState;

  previousState = digitalRead(pin);          // store switch state
  if (previousState == LOW) { // LOW means pressed (because pull-ups are used)
    for(int counter=0; counter < debounceDelay; counter++)
    {
      delay(1);                  // wait for 1 millisecond
      state = digitalRead(pin);  // read the pin
      if( state != previousState)
      {
        counter = 0; // reset the counter if the state changes
        previousState = state;  // and save the current state
      }
    }
    // here when the switch state has been stable longer than the debounce period
    if(state == LOW)  // LOW means pressed (because pull-ups are used)
      return true;
    else
      return false;
  } 
  else {
    return false;
  }

}

void log() {

  Serial.print("Total: ");
  Serial.println(total);

  Serial.print("A: ");
  Serial.print(counts[0]);
  Serial.print(" (");
  Serial.print(counts[0] == 0 ? 0: map(counts[0] * 100 / total, 1, 100, 1, 12));
  Serial.print("/12)");

  Serial.print(", B: ");
  Serial.print(counts[1]);
  Serial.print(" (");
  Serial.print(counts[1] == 0 ? 0: map(counts[1] * 100 / total, 1, 100, 1, 12));
  Serial.print("/12)");

  Serial.print(", C: ");
  Serial.print(counts[2]);
  Serial.print(" (");
  Serial.print(counts[2] == 0 ? 0: map(counts[2] * 100 / total, 1, 100, 1, 12));
  Serial.println("/12)");
}

void setup() {

  for (int i = 0; i < numButtons; i++) {

    pinMode(buttons[i], INPUT);
    digitalWrite(buttons[i],HIGH);  // turn on internal pull-up on the inputPin

    pinMode(leds[i],    OUTPUT); // Enable the LED for output
    digitalWrite(leds[i], HIGH); // light it

    bargraphs[i] = new BarGraph(); // Create and initialize each BarGraph
    bargraphs[i]->setValue(0);

  }
  bargraphs[0]->setStartPin(26);
  bargraphs[1]->setStartPin(33);
  bargraphs[2]->setStartPin(40);

  Serial.begin(9600);
}

void loop()
{

  // Check each button
  for (int i = 0; i < numButtons; i++) {

    if(debounce(buttons[i])) // Did we get a button press?
    {

      Serial.println("Taking all LEDs low");
      digitalWrite(leds[0], LOW);
      digitalWrite(leds[1], LOW);
      digitalWrite(leds[2], LOW);

      Serial.println("Blinking the button you pressed");
      // Blink the button the user just pressed.
      for (int j = 0; j < 3; j++) {
        digitalWrite(leds[i], HIGH);
        delay(blinkDelay);
        digitalWrite(leds[i], LOW);
        delay(blinkDelay);
      }

      Serial.println("Taking all LEDs high");
      digitalWrite(leds[0], HIGH);
      digitalWrite(leds[1], HIGH);
      digitalWrite(leds[2], HIGH);

      // Increment the button's counter and the total
      counts[i]++;
      total++;

      log(); // Log the current values

      // Recalculate all percentages
      for (int j = 0; j < numButtons; j++) {
        // Recalculate the bargraph value     
        int percent = counts[j] * 100 / total;
        int scaled = percent == 0 ? 0: map(percent, 1, 100, 1, 12);
        bargraphs[j]->setValue(scaled);
      }
    }

    // Strobe the bar graph
    bargraphs[i]->light(true);


  }

}





















