		var ws;
		var numPerSec = 7;
		var timeTilGas = 120 * numPerSec; // Number of indices until we trigger gas.
		var speedRange = 3 * numPerSec; // Number of indices for speed window.
		var enoughIndices = speedRange * 2 + 10;

		Ctrl = function() {
		  this.ind = 0;
		  this.startNow = 0; // where to start cutting off the mean from.
		  this.sumNowSpeed = 0;
		  this.startSlow = 20; // twenty events later find out what speed is.
		  this.sumSlowSpeed = 0;
		  this.coastingTimes = 0; // Increment on each step we think we coast.
		  
		  this.slowDownCalled = false;
		  this.findParkingCalled = 0; // index at which find parking was called.
		  this.messages = [];
		  this.coastingRangeTime = 0; // number of times I am coasting.

		  // Gasoline.
		  this.startAskGas = false;
		  this.startAskInd = 0;
		  this.promptedGas = false; // Do it only once.
		
		  this.akivasWay = false;
		  this.downSample = 3;
		  this.alwaysInd = 0;
		};

		// Trigger find parking when you are going below 18 mph on average,
		// You've slowed down signifcantly, by 5 mph, and you are going at least
                // less than 18 and more than 9 for 3 seconds.
		Ctrl.prototype.ask = function(response) {
			// Throw out random messages.
			if (('vehicle_status' in response) == false) {
			  return;
			}

			this.alwaysInd += 1;

			if ((this.alwaysInd % this.downSample) != 0) {
			  return;
			}

			// Now we can sample.
			this.messages.push(response);
			this.ind += 1;

			this.askGas();
			if (this.ind < enoughIndices) {return;}
			// I have enough time to start computing.
			if (this.ind == enoughIndices + 1) {
			  // set up averages.
			  for (var i = this.startNow; i < this.startNow + speedRange; i++) { 
				this.sumNowSpeed += this.getSpeed(i) ; 
			  }
			  for (var i = this.startSlow; i < this.startSlow + speedRange; i++) { 
				this.sumSlowSpeed += this.getSpeed(i) ; 
			  }
			}
			var rightNowSpeed = this.getSpeed(this.ind - 1);
			var prevSpeed = this.getSpeed(this.ind - 2);
			if (rightNowSpeed > 9) {

			  if (this.akivasWay == true) {

			    // Using Akiva heuristic 1.
			    if (rightNowSpeed > 13 && rightNowSpeed < 18) {
			      this.coastingRangeTime += 1;	
			    } else {
			      this.coastingRangeTime = 0;
			    }
		  	    // If we have been coasting for lets say 10 seconds = 70 beats.
			    if (this.coastingRangeTime > 69) {
			      this.findParkingMaybe();
			    }
			  }

			else {
			// Now remove subtract the cut off value and cutoff + 20 value.
			var nowRemoveVal = this.getSpeed(this.startNow);
			this.sumNowSpeed += this.getSpeed(this.startNow + speedRange) - nowRemoveVal;			

			var slowRemoveVal = this.getSpeed(this.startSlow);
			this.sumSlowSpeed += this.getSpeed(this.startSlow + speedRange) - slowRemoveVal;

			// Test differences in average speeds.
			var avgNow = this.sumNowSpeed / speedRange;
			var avgSlow = this.sumSlowSpeed / speedRange;
			var objFunc = avgNow - avgSlow;
			var averageSpeedIsReasonable = avgSlow < 18;
			if (objFunc > 5 && averageSpeedIsReasonable) {
				// You have slowed down significantly now trigger find parking.
				if (this.slowDownCalled == false) {
				  this.slowDownCalled = true;
				  this.coastingTimes = 1;
				} else {
			          // Maybe we are coasting maybe we aren't.
				    if (rightNowSpeed < prevSpeed + 2) {
					this.coastingTimes += 1;
				    } else {
					this.slowDownCalled = false;
				    }
				    if (this.coastingTimes > 20) { // Coast for 3 seconds?
				      this.findParkingMaybe();
			            }
				}
				
			}
			}

			}

	
			// Increment values.
			this.startNow += 1;
			this.startSlow += 1;
		};

		Ctrl.prototype.askGas = function() {
		  if (this.promptedGas) { return;}
		  // Make sure the user has passed 10 mph, then start the timer.
		  var curSpeed = this.getSpeed(this.ind - 1);
		  if (curSpeed > 10 && !this.startAskGas) {
		    this.startAskGas = true;
		    this.startAskInd = this.ind;
		  }
		  if (this.startAskGas) {
		    var bigDiff = this.ind - this.startAskInd;
		     if (bigDiff > timeTilGas) {
			promptGas();
			this.promptedGas = true;
		     }
	          }
		};

		Ctrl.prototype.findParkingMaybe = function() {
		      var bigDiff = this.ind - this.findParkingCalled;
		      if (bigDiff > 100) { // Wait another 10 seconds before calling another.
		        this.findParkingCalled = 0; // can call it again.
		      }
		      if (this.findParkingCalled == 0) {
		        promptParking();
		        this.findParkingCalled = this.ind;
		      }
		};

		Ctrl.prototype.getSpeed = function(i) {
			// TODO: convert the units!
			var msg = this.messages[i];
			var kph = msg.vehicle_status.speed;
			return 0.621371 * kph;
		};

	 	Ctrl.prototype.curLatLong = function() {
			var length = this.messages.length;
			var msg = this.messages[length - 1];
		        return {lat: msg.gps_status.latitude, lon: msg.gps_status.longitude};	
		};

	 	Ctrl.prototype.curSpeed = function() {
			var length = this.messages.length;
			return this.getSpeed(length - 1);
		};

	 	Ctrl.prototype.curGas = function() {
			var length = this.messages.length;
			return this.getGas(length - 1);
		};

		Ctrl.prototype.getGas = function(i) {
			var msg = this.messages[i];
		  	return msg.vehicle_status.fuelLevel;
		};

		Ctrl.prototype.getLastMessage = function() {
		  return this.messages[this.ind - 1];
		};

		if (('promptParking' in window) == false) {
		  promptParking = function() {
		  	console.log('Finding parking at ' + ctrl.ind);
		  };
		}

		if (('promptGas' in window) == false) {
		  promptGas = function() {
		  	console.log('Prompting gas at ' + ctrl.ind);
		  };
		}

                Ctrl.prototype.mess = function(msg) {
                  var myMsg = {index: ind, txt: msg};
                  window.console.log(myMsg);
                  this.appendTxtNode(JSON.stringify(myMsg));
                };

		Ctrl.prototype.appendTxtNode = function(msg) {
			var table = document.getElementById("messagesTable");
			var txtNode = document.createTextNode(msg);
			var trNode = document.createElement('tr');
			var tdNode1 = document.createElement('td');
			var tdNode2 = document.createElement('td');

			table.appendChild(trNode);
			trNode.appendChild(tdNode1);
			tdNode1.appendChild(txtNode);
		};

		Ctrl.prototype.doSend = function() {
			var msg = $('#sendmsg').val();
			if (!msg.length) {
				return;
			}
			ws.send(msg);
			$('#sendmsg').val('');
		};

		Ctrl.prototype.onMessageHandler = function(msg) {
			var response = JSON.parse(msg.data);
			//console.log(response);
                        var mydate = new Date();
			response['myind'] = ctrl.ind;
 			response['mydate'] = mydate;
			this.ask(response);
			this.appendTxtNode(JSON.stringify(response));
  		};

		Ctrl.prototype.init = function() {
			ws = new WebSocket('ws://192.168.150.1/notif');
			ws.onopen = function(e) {
				appendTxtNode('Socket opened');
			};
			ws.onmessage = this.onMessageHandler;
			ws.onclose = function(e) {
				appendTxtNode('Socket closed');
			};
		};

		Ctrl.prototype.init3 = function() {
		  for (var i = 0; i < OUTPUT.length; i++) {
		    var data = OUTPUT[i];
		    this.onMessageHandler({data: JSON.stringify(data)});
		  }
		};

                Ctrl.prototype.init2 = function() {
		  var speeds = [17, 10];
		  var upTo = 0;
		  var curInd = 0;
		  for (var i = 0; i < 3000; i++) {
		    var speed = speeds[curInd] / 0.62;
	            upTo += 1;
		    var fuelLevel = 85 + 0.1 * i;
		    if (upTo > 150) {speed = speeds[curInd];  upTo = 0; if (curInd == 0) {curInd = 1;} else {curInd = 0;};}
		    var response = {vehicle_status: {speed: speed, fuelLevel: fuelLevel},
				    gps_status: {latitude: 100, longitude: 101}};
		    this.onMessageHandler({data: JSON.stringify(response)});
		    //console.log(ctrl.curLatLong());
		    //console.log(ctrl.curSpeed());
		    //console.log(ctrl.curGas());
		    //console.log(ctrl.getLastMessage());
		  }
		};

		//var ctrl = new Ctrl();
