var cheerio = require("cheerio");
var express = require("express");
var mysql = require('mysql');
var http = require("http");
var fs = require('fs');
var app = express();
 
function OpenDataInput(url, callback) {
	http.get(url, function(res) {
    	var data = "";
    	res.on('data', function (chunk) {
      		data += chunk;
    	});
    	res.on("end", function() {
      		callback(data);
    	});
  	}).on("error", function() {
    	callback(null);
  	});
}

function VideoDataProcess(data, name, callback) {
	var objects = [];
	$ = cheerio.load(data);
	
	
	$('div.video_ids').each(function(i, elem) {
		var object = new Object();
		object.name = name;
		object.video = $(this).text();			
		objects.push(object);
		data += object.name + "\n" + object.video + "\n";
	});

	data = JSON.stringify(objects)
	
	callback(data);
}
function ListDataProcess(data, callback) {
	$ = cheerio.load(data);
	var object = new Object();
	$('h1.title').each(function(i, elem) {
	 	object.name = $(this).text().split("/")[0].replace(/\s+/g, ' ');
	});

	object.introduction = "";
	$('div.show_body').each(function(i, elem) {
 		object.introduction = $(this).text().toString("utf8").replace(/\n+/g,'');
	});
	updateInfo(object,"introduction");
	
	object.poster_url = "";
	$('div.show_body > p > img').each(function(i, elem) {
 		object.poster_url = $(this)[0].attribs.src;
	});
	updateInfo(object,"poster_url");
 	
	object.eps_num_str = "";
	$('a.title').each(function(i, elem) {
		var regex = /第[0-9]{0,5}集/;
		var number = $(this).text().match(regex);
		if (number!=null && $(this).text().indexOf(object.name)!=-1) {
			object.eps_num_str = object.eps_num_str + number + ","
			object.eps_num_str = object.eps_num_str.replace("第","").replace("集","");
		}	
	});
	updateInfo(object,"eps_num_str");

	callback(null);

	/*OpenDataInput(object.src, function(data) {
		if (data) {
			VideoDataProcess(data, object.name, function(data) {
				OpenDataOutput(response, data);
			});
	 	}  
	});*/ 	
}

function OpenDataProcess(data, callback) {
	$ = cheerio.load(data);
	var objects = [];
	
	$('div.compact-list a').each(function(i, elem) {
		
		var object = new Object();
		object.name = $(this).text().split("/")[0].replace(/\s+/g, ' ');
		if ($('div.dramasPage').text().indexOf("台灣")!=-1) {
			object.area_id = 1;
		}
		if ($('div.dramasPage').text().indexOf("大陸")!=-1) {
			object.area_id = 2;
		}
		if ($('div.dramasPage').text().indexOf("韓國")!=-1) {
			object.area_id = 3;
		}
		if ($('div.dramasPage').text().indexOf("日本")!=-1) {
			object.area_id = 4;
		}
		createInfo(object);

		
		object.src = "http://www.maplestage.com" + $(this)[0].attribs.href;
		OpenDataInput(object.src, function(data) {
			if (data) {
				ListDataProcess(data, function(data) {
				});
		 	}
		});
		objects.push(object);
	});

	$('ul.yearSorting').each(function(i, elem) {
		$ = cheerio.load($(this).html());
		$('li').each(function(i, elem) {
			$ = cheerio.load($(this).html());
			var year = $('h2').text();
			$('div.compact-list a').each(function(i, elem) {
				var object = new Array();
				object[0] = $(this).text().split("/")[0].replace(/\s+/g, ' ');
				object[1] = year;
				release_date.push(object);
			});
		});
	});
	data = JSON.stringify(objects)
	callback(data);
}


function OpenDataOutput(response,data) {
	response.setHeader('Content-Length', Buffer.byteLength(data));
	response.setHeader('Content-Type', 'text/plain; charset="utf-8"');
	response.write(data);
	response.end();
}

function updateInfo(data, type) {

	var connection = mysql.createConnection({
	    host: 'localhost',
	    user: 'root',
	    password: '',
	});
	connection.query("USE nodejs;");
	switch (type) {
		case "introduction":
			var sql = "UPDATE info SET introduction=" + mysql.escape(data.introduction) + " WHERE name=" + mysql.escape(data.name) + ";";
			break;
		case "eps_num_str":
			var sql = "UPDATE info SET eps_num_str=" + mysql.escape(data.eps_num_str) + " WHERE name=" + mysql.escape(data.name) + ";";
			break;
		case "poster_url":
			var sql = "UPDATE info SET poster_url=" + mysql.escape(data.poster_url) + " WHERE name=" + mysql.escape(data.name) + ";";
			break;
		case "release_date":
			var sql = "UPDATE info SET release_date=" + mysql.escape(data.release_date) + " WHERE name=" + mysql.escape(data.name) + ";";
			break;
		case "area_id":
			var sql = "UPDATE info SET area_id=" + mysql.escape(data.area_id) + " WHERE name=" + mysql.escape(data.name) + ";";
			break;
	}
	connection.query(sql);
	connection.end();
}
function createInfo(data) {
	
	var connection = mysql.createConnection({
	    host: 'localhost',
	    user: 'root',
	    password: '',
	});
	connection.query("USE nodejs;");
	connection.query("SELECT * FROM info WHERE name="+ mysql.escape(data.name), function(err, rows, fields) {
		try {
			if (rows.length == 0) {
				var sql = "INSERT INTO info (name,area_id) VALUES (" + mysql.escape(data.name) + "," + mysql.escape(data.area_id) + ");";
				connection.query(sql);
			}
		} catch (err){
			
		}
		connection.end();
	});
	
}

var response = null;

app.get("/CH", function(req, res) {
	response = res;
	var url = "http://www.maplestage.com/drama/ch/"
	OpenDataInput(url, function(data) {
		if (data) {
			OpenDataOutput(response, "China Video Processing...");
			OpenDataProcess(data, function(data) {} );
	 	}  
	});
});

app.get("/KR", function(req, res) {
	response = res;
	var url = "http://www.maplestage.com/drama/kr/"
	OpenDataInput(url, function(data) {
		if (data) {
			OpenDataOutput(response, "Korea Video Processing...");
			OpenDataProcess(data, function(data) {} );
	 	}  
	});
});

app.get("/JP", function(req, res) {
	response = res;	
	var url = "http://www.maplestage.com/drama/jp/"
	OpenDataInput(url, function(data) {
		if (data) {
			OpenDataOutput(response, "Japan Video Processing...");
			OpenDataProcess(data, function(data) {} );
	 	}  
	});
});

app.get("/TW", function(req, res) {
	response = res;	
	var url = "http://www.maplestage.com/drama/tw/"
	OpenDataInput(url, function(data) {
		if (data) {
			OpenDataOutput(response, "Taiwan Video Processing...");
			OpenDataProcess(data, function(data) {} );
	 	}  
	});
});

http.createServer(app).listen(1337);