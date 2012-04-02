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

String my_name = "UNDEFINED";
String server = "10.0.1.26:8888";

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

void flushMe() {
  
  Serial.println("Aborting any pending sessions");
  Serial1.println("xig://abort");
  Serial1.flush();
  delay(1000);
  Serial.println("Clearing any incoming serial data.");
  while(Serial1.available()) {
    char c = (char) Serial1.read();
    Serial.print(c);
  }
  Serial.println("Done clearing incoming serial data.");
}

void vote(int button) {

  flushMe();
  Serial1.println("http://" + server + "/vote?s=" + my_name + "&b=" + button); 
  Serial1.flush();
  delay(250);
  if (!getVotes()) {
    panic("Could not register vote"); // FIXME: recover by sending abort and trying again
  }

}

boolean getVotes() {

  delay(2000);
  for (int i = 0; i < numButtons; i++) {
    counts[i] = 0;
  }

  int curr_button = 0;
  while (Serial1.available() > 0) {

    char ch = Serial1.read(); 
    if(ch >= '0' && ch <= '9') {
      counts[curr_button] = (counts[curr_button]  * 10) + (ch - '0');
    } 
    else if (ch == ':') {
      curr_button++;
    } else if (ch != '\n') {
      Serial.print("Unexpected char [");
      Serial.print(ch);
      Serial.print("]");
    }
  }

  total = 0;
  for (int i = 0; i < numButtons; i++) {
    total += counts[i];
  }

  if (curr_button < numButtons - 1) {
    Serial.print("Received ");
    Serial.print(curr_button);
    Serial.print(" button values, expected ");
    Serial.println(numButtons - 1);
    return false;

  } 
  else {
    return true;
  }
}

boolean panic(String s) {

  delay(3000);
  flushMe();
  Serial.println(s);
  while (1) {
    digitalWrite(leds[0], LOW);
    digitalWrite(leds[1], LOW);
    digitalWrite(leds[2], LOW);
    digitalWrite(13, LOW);

    delay(250);
    digitalWrite(leds[0], HIGH);
    digitalWrite(leds[1], HIGH);
    digitalWrite(leds[2], HIGH);
    digitalWrite(13, HIGH);
    delay(250);
  }
}

boolean configureRadio() {
  Serial.flush();

  // put the radio in command mode: 
  Serial.println("Setting XBee command mode");
  Serial1.print("+++"); 
  Serial1.flush();
  delay(100);

  String ok_response = "OK\r"; // the response we expect.
  my_name = "";

  // Read the text of the response into the response variable
  String response = String("");
  long curr = millis();
  while (response.length() < ok_response.length() && curr + 10000 > millis() ) { 
    if (Serial1.available() > 0) {
      response += (char) Serial1.read(); 
    }
  }

  // If we got the right response, configure the radio and return true. 
  if (response.equals(ok_response)) {
    Serial.println("Requesting XBee device name");
    Serial1.print("ATNI\r"); // Get name
    Serial1.flush();
    delay(100);
    while (Serial1.available() > 0) {
      char c = (char) Serial1.read(); 
      if ( (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || c == '_') {
        my_name += c;
      }
    }
    if (my_name == "") {
      my_name = "UNDEFINED_SET_ME_WITH_ATNI";
    }
    Serial.println("My address: [" + my_name + "]");


    Serial1.print("ATCN\r"); // back to data mode
    Serial1.flush();
    String response = String("");
    long curr = millis();
    while (response.length() < ok_response.length() && curr + 10000 > millis() ) { 
      if (Serial1.available() > 0) {
        response += (char) Serial1.read();
      }
    }

    return true; 
  } 
  else {
    return false; // This indicates the response was incorrect. 
  }

}

void setup() {

  for (int i = 0; i < numButtons; i++) {
    pinMode(buttons[i], INPUT);
    pinMode(leds[i],    OUTPUT); // Enable the LED for output
  }
  
  Serial.begin(9600);
  Serial.println("Booted. Waiting for XBee to warm up."); // FIXME: check XBee to see if it's associated instead of twiddling yer thumbs
  Serial1.begin(115200); // The XBee
  delay(5000);

  if (!configureRadio()) {
    panic("Could not configure radio");
  }

  flushMe();
  Serial1.println("http://" + server + "/stationVotes?s=" + my_name); 
  Serial1.flush();
  Serial.println("Trying http://" + server + "/stationVotes?s=" + my_name); 
  delay(250);
  if (!getVotes()) {
    panic("Could not retrieve votes"); // FIXME: recover by sending abort and trying again
  }

  for (int i = 0; i < numButtons; i++) {

    digitalWrite(buttons[i],HIGH);  // turn on internal pull-up on the inputPin
    digitalWrite(leds[i], HIGH); // light it

    bargraphs[i] = new BarGraph(); // Create and initialize each BarGraph
    bargraphs[i]->setValue(0);

  }
  bargraphs[0]->setStartPin(40);
  bargraphs[1]->setStartPin(33);
  bargraphs[2]->setStartPin(26);

  log();
  recalculatePercentages();

  pinMode(13,    OUTPUT);
  digitalWrite(13, HIGH);

}

void recalculatePercentages() {

  // Recalculate all percentages
  for (int j = 0; j < numButtons; j++) {
    // Recalculate the bargraph value
    if (counts[j] == 0) {
      bargraphs[j]->setValue(0);
    } 
    else {
      int percent = counts[j] * 100 / total;
      int scaled = percent == 0 ? 0: map(percent, 1, 100, 1, 12);
      bargraphs[j]->setValue(scaled);
    }
  }

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
      vote(i); // Transmit the vote to the server
      for (int j = 0; j < 3; j++) {
        digitalWrite(13, HIGH);
        digitalWrite(leds[i], HIGH);
        delay(blinkDelay);
        digitalWrite(13, LOW);
        digitalWrite(leds[i], LOW);
        delay(blinkDelay);
      }

      Serial.println("Taking all LEDs high");
      digitalWrite(leds[0], HIGH);
      digitalWrite(leds[1], HIGH);
      digitalWrite(leds[2], HIGH);

      log(); // Log the current values

      recalculatePercentages();
    }

    // Strobe the bar graph
    bargraphs[i]->light();


  }

}



































