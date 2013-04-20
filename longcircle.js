		var ws;

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
		};

		// Trigger find parking when you are going below 18 mph on average,
		// You've slowed down signifcantly, by 5 mph, and you are going at least
                // less than 18 and more than 9 for 3 seconds.
		Ctrl.prototype.ask = function(response) {
			// Throw out random messages.
			if (('vehicle_status' in response) == false) {
			  return;
			}

			this.messages.push(response);
			this.ind += 1;

			if (this.ind < 41) {return;}
			// I have enough time to start computing.
			if (this.ind == 42) {
			  // set up averages.
			  for (var i = this.startNow; i < this.startNow + 20; i++) { 
				this.sumNowSpeed += this.getSpeed(i) ; 
			  }
			  for (var i = this.startSlow; i < this.startSlow + 20; i++) { 
				this.sumSlowSpeed += this.getSpeed(i) ; 
			  }
			}

			var rightNowSpeed = this.getSpeed(this.ind - 1);
			var prevSpeed = this.getSpeed(this.ind - 2);
			if (rightNowSpeed > 9) {
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

			// Now remove subtract the cut off value and cutoff + 20 value.
			var nowRemoveVal = this.getSpeed(this.startNow);
			this.sumNowSpeed += this.getSpeed(this.startNow + 20) - nowRemoveVal;			

			var slowRemoveVal = this.getSpeed(this.startSlow);
			this.sumSlowSpeed += this.getSpeed(this.startSlow + 20) - slowRemoveVal;

			// Test differences in average speeds.
			var avgNow = this.sumNowSpeed / 20;
			var avgSlow = this.sumSlowSpeed / 20;
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

	
			// Increment values.
			this.startNow += 1;
			this.startSlow += 1;
		};

		Ctrl.prototype.findParkingMaybe = function() {
		      var bigDiff = this.ind - this.findParkingCalled;
		      if (bigDiff > 100) { // Wait another 10 seconds before calling another.
		        this.findParkingCalled = 0; // can call it again.
		      }
		      if (this.findParkingCalled == 0) {
		        this.findParking();
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

		Ctrl.prototype.findParking = function() {
			console.log('Finding parking at ' + this.ind);
		};

		var ctrl = new Ctrl();

                function mess(msg) {
                  var myMsg = {index: ind, txt: msg};
                  window.console.log(myMsg);
                  appendTxtNode(JSON.stringify(myMsg));
                }
		function appendTxtNode(msg) {
			var table = document.getElementById("messagesTable");
			var txtNode = document.createTextNode(msg);
			var trNode = document.createElement('tr');
			var tdNode1 = document.createElement('td');
			var tdNode2 = document.createElement('td');

			table.appendChild(trNode);
			trNode.appendChild(tdNode1);
			tdNode1.appendChild(txtNode);
		}
		function doSend() {
			var msg = $('#sendmsg').val();
			if (!msg.length) {
				return;
			}
			ws.send(msg);
			$('#sendmsg').val('');
		}

		function onMessageHandler(msg) {
			var response = JSON.parse(msg.data);
			//console.log(response);
                        var mydate = new Date();
			response['myind'] = ctrl.ind;
 			response['mydate'] = mydate;
			ctrl.ask(response);
			appendTxtNode(JSON.stringify(response));
  		}

		function init() {
			ws = new WebSocket('ws://192.168.150.1/notif');
			ws.onopen = function(e) {
				appendTxtNode('Socket opened');
			};
			ws.onmessage = onMessageHandler;
			ws.onclose = function(e) {
				appendTxtNode('Socket closed');
			};
		}

		function init3() {
		  for (var i = 0; i < OUTPUT.length; i++) {
		    var data = OUTPUT[i];
		    onMessageHandler({data: JSON.stringify(data)});
		  }
		}

                function init2() {
		  var speeds = [17, 10];
		  var upTo = 0;
		  var curInd = 0;
		  for (var i = 0; i < 300; i++) {
		    var speed = speeds[curInd];
	            upTo += 1;
		    if (upTo > 50) {speed = speeds[curInd];  upTo = 0; if (curInd == 0) {curInd = 1;} else {curInd = 0;};}
		    var response = {vehicle_status: {speed: speed},
				    gps_status: {latitude: 100, longitude: 101}};
		    onMessageHandler({data: JSON.stringify(response)});
		    //console.log(ctrl.curLatLong());
		  }
		}
