
const int debounceDelay = 10;  // milliseconds to wait until stable
const int blinkDelay = 250;

int numButtons = 3;
int buttons[] = {
  47, 48, 49};
int leds[] = {
  50, 51, 52};
int counts[] = {
  0, 0, 0};

boolean debounce(int pin)
{
  boolean state;
  boolean previousState;

  previousState = digitalRead(pin);          // store switch state
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


void setup() {

  Serial1.begin(9600);
  Serial1.write(0x7A);
  Serial1.write( (byte) 0x0);
  Serial1.print("v");

  Serial2.begin(9600);
  Serial2.print("v");
  
  Serial3.begin(9600);
  Serial3.print("v");

  for (int i = 0; i < numButtons; i++) {
    pinMode(buttons[i], INPUT);
    digitalWrite(buttons[i],HIGH);  // turn on internal pull-up on the inputPin
    pinMode(leds[i],    OUTPUT);
  }

}

void loop()
{

  char fourChars[5];


  for (int i = 0; i < numButtons; i++) {


    if(debounce(buttons[i]))
    {
      for (int j = 0; j < 3; j++) {
        digitalWrite(leds[i], HIGH);
        delay(blinkDelay);
        digitalWrite(leds[i], LOW);
        delay(blinkDelay);
      }
      counts[i]++;
    }
  }

  sprintf(fourChars, " %02d ", counts[0]);
  Serial1.print("v");
  Serial1.print(fourChars);

  sprintf(fourChars, " %02d ", counts[1]);
  Serial2.print("v");
  Serial2.print(fourChars);

  sprintf(fourChars, " %02d ", counts[2]);
  Serial3.print("v");
  Serial3.print(fourChars);


}




