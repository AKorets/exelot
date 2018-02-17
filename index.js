const { Chromeless } = require('chromeless');
const fs = require('fs-extra')
const pretty = require('pretty');
const date = require('date-and-time');
const PushBullet = require('pushbullet');

if(process.argv.length<4){
	console.error('usage : node index.js "trackNum" "pushBulletId"');
	return;
}

const trackNum = process.argv[2];
const pushBulletId = process.argv[3];

async function updatePushBullet(parseH, pHtml){
	//console.log(parseH);
	updateExist = parseH.needUpdate;
	days = parseH.days;
	daysStr = "days since last updates "+days;
	if(updateExist){
		var pusher = new PushBullet(pushBulletId);
		await pusher.note(null, "Order "+trackNum, "days:"+days+"\n"+pHtml);
	}else{
		if(days % 5 == 0){
			var pusher = new PushBullet(pushBulletId);	
            await pusher.note(null, "Order "+trackNum , daysStr);			
		}
	}
}

async function parseHtmlResponse(trNum, htmlResp, fileName){
	//console.log('analyzing :'+htmlResp);	
	var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
    var days = -1;
	//console.log('------');
	var allDates = htmlResp.match(/\d{2}-\d{2}-\d{2}/gi);
	//console.log('extracted date:'+allDates.slice(-1)[0]);
	var lastDate = date.parse(allDates.slice(-1)[0], 'DD-MM-YY');
	let now = new Date();
	var days = Math.round(Math.abs((now.getTime() - lastDate.getTime())/(oneDay)));
	//console.log('days:'+days);
	
	var needUpdate = false;
	const exists = await fs.pathExists(fileName);
	if(exists){
		//console.log('file exists '+fileName);
		content = await fs.readFile(fileName, 'utf8');
		if(content != htmlResp)
			needUpdate = true
	}
	else
		needUpdate = true;
	return {needUpdate, days};
}

async function getTrackHtml(trackNum){
  const chromeless = new Chromeless({})
  //console.log('needed : '+trackNum);

  const rawHtml = await chromeless
    .goto('http://my.exelot.com/public/track')
    .type(trackNum, 'input[name="tracking_num"]')
    .click('.btn-primary')
    .wait('#trackingInfo')
	.evaluate(() => {
		//console.log('element : '+document.getElementById("trackingInfo").innerHTML);
		return document.getElementById("trackingInfo").innerHTML;
	});
  await chromeless.end()
  return pretty(rawHtml);
}

async function run() {
  var pHtml = await getTrackHtml(trackNum);
  
  let fileName = "Track"+trackNum+".txt";
  let parseH = await parseHtmlResponse(trackNum, pHtml, fileName);
  await updatePushBullet(parseH, pHtml);
  
  if(parseH.needUpdate){
	  console.log('Creating cache file : '+fileName);
	  await fs.outputFile(fileName, pHtml)
  }
}

run().catch(console.error.bind(console))