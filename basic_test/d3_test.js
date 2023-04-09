//var d3 = require('./d3.min.js');
import * as d3 from 'd3';
//const jsdom = require('jsdom');
import jsdom from 'jsdom';

const { JSDOM } = jsdom;

const document = new JSDOM(`<!DOCTYPE html><body></body>`).window.document;


var svg = d3.select(document.body).append('svg')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('width', 500)
    .attr('height', 500);


svg.append("circle")
    .attr("cx",250)
    .attr("cy",250)
    .attr("r",250)
    .attr("fill","Red");

// 保存svg为svg文件
var svgString = document.body.innerHTML;
console.log(svgString);