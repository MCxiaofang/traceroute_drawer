import jsdom from 'jsdom';      // mapulates a browser environment
import * as d3 from 'd3';       // draws the chart
import * as fs from 'fs';       // reads and writes files


var config;
try {
    const data = fs.readFileSync('./config.json', 'utf8');
    config = JSON.parse(data);
} catch (err) {
    console.log(`Error reading file from disk: ${err}`);
}

function test(data){
    data.width = 100;
}

var data = {"width": 500, "height": 500};
test(data);
console.log(data);

console.log("name",config.name)
console.log("age",config.age)
