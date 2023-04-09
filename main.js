import jsdom from 'jsdom';      // mapulates a browser environment
import * as d3 from 'd3';       // draws the chart
import * as fs from 'fs';       // reads and writes files
import sharp from 'sharp'; // converts svg to png


var data = readJson('./draw_data.json');
// data is a json list, please traversal it
for (let i in data) {
    let item = data[i];

    let filepath_svg = './graphs_svg/' + item.city
    if (!fs.existsSync(filepath_svg)) {
        fs.mkdir(filepath_svg, { recursive: true }, (err) => {
            if (err) throw err;
        });
    }
    let filepath_png = './graphs_png/' + item.city
    if (!fs.existsSync(filepath_png)) {
        fs.mkdir(filepath_png, { recursive: true }, (err) => {
            if (err) throw err;
        });
    }

    filepath_svg += '/' + item.dst_target + "_" + item.dst_loc_code + "_" + item.dst_loc_name + '.svg';
    filepath_png += '/' + item.dst_target + "_" + item.dst_loc_code + "_" + item.dst_loc_name + '.png';
    console.log('rendering: ' + filepath_svg)

    let svg_str = render(item);

    fs.writeFile(filepath_svg, svg_str, function (err) {
        if (err) throw err;
        console.log('SVG Saved: ' + filepath_svg);
        sharp(filepath_svg,{ density: 300 })
            .png()
            .toFile(filepath_png)
            .then(function (info) {
                console.log(info)
            })
            .catch(function (err) {
                console.log(err)
            })
    });

}


// read json file
function readJson(filepath) {
    try {
        const data = fs.readFileSync(filepath, 'utf8');
        const res = JSON.parse(data);
        return res;
    } catch (err) {
        console.log(`Error reading file from disk: ${err}`);
    }
}

function render(data) {
    const { JSDOM } = jsdom;
    const document = new JSDOM(`<!DOCTYPE html><body></body>`).window.document;

    let settings = {
        "width": 100,
        "height": 100,
        "x_gap": 90,
        "y_gap": 70,
        "radius": 6,
        "max_radius": 20,
        "stroke_width": 2,
        "margin_ver": 20,
        "margin_hor": 40,
        "offset_ver": 30
    };

    // extrace all asn number to a list
    function exASN(data) {
        var infos = data.infos;
        var asns = [];
        for (let ip in infos) {
            if (asns.includes(infos[ip].asn)) continue;
            asns.push(infos[ip].asn);
        }
        return asns;
    }

    function color(asn) {
        if (asn === -1) return "#808080";
        else return scale(asn);
    }

    function fontColor(is_abroad) {
        if (is_abroad) return "#c00000";
        else return "#0";
    }

    let processedData = calPos(data, settings);

    const links = processedData.links;
    const nodes = processedData.nodes;


    const svg = d3.select(document.body).append('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('width', settings.width)
        .attr('height', settings.height);

    let offset = 10 + settings["radius"] / 2 + settings["stroke_width"] + 2;
    let asns = exASN(data);
    let scale = d3.scaleOrdinal(d3.schemeCategory10).domain(asns);


    // create template of arrows
    svg.append('defs')
        .append('marker')
        .attr('id', 'arrow')
        .attr('markerUnits', 'strokeWidth')
        .attr('markerWidth', '12')
        .attr('markerHeight', '12')
        .attr('viewBox', '0 0 12 12')
        .attr('refX', offset)
        .attr('refY', '6')
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M2,2 L10,6 L2,10 L6,6 L2,2')
        .attr('style', 'fill:#foo');

    // create graph
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("marker-end", "url(#arrow)")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", 2)
        .attr("x1", d => d.source.cx)
        .attr("y1", d => d.source.cy)
        .attr("x2", d => d.target.cx)
        .attr("y2", d => d.target.cy);

    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("stroke", "#d8d8d8")
        .attr("stroke-width", settings["stroke_width"])
        .attr("r", d => Math.min(settings["radius"] + d.degree, settings["max_radius"]))
        .attr("fill", d => color(d.asn))
        .attr("cx", d => d.cx)
        .attr("cy", d => d.cy);

    const ipText = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .style("fill", "black")
        .style('font-size', '8px')
        .style('font-family', 'Times news Roman')
        .style('font-weight', 'bold')
        .attr("dy", 30)
        .attr("dx", -30)
        .attr("x", d => d.cx)
        .attr("y", d => d.cy)
        .text(d => d.ip);

    const addrText = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .style("fill", d => fontColor(d.is_abroad))
        .style('font-size', '8px')
        .style('font-family', 'Times news Roman')
        .style('font-weight', 'bold')
        .attr("dy", 40)
        .attr("dx", d => -2.5 * d.addr.length)
        .attr("x", d => d.cx)
        .attr("y", d => d.cy)
        .text(d => d.addr);

    return document.body.innerHTML;
}

function calPos(data, s) {
    let paths = data["paths"];
    let infos = data["infos"];

    // 计算每个节点的所处位置级别，以及其权重（通过出入度计算）
    let points = {};
    for (const path of paths) {
        for (let ttl in path) {
            let ip = path[ttl];
            if (ip == null) continue;
            if (points[ip] === undefined) {
                points[ip] = []
                points[ip]["ttl"] = 1000;
                points[ip]["degree"] = 0;
            }

            points[ip]["ttl"] = Math.min(points[ip]["ttl"], ttl);
            points[ip]["degree"]++;
        }
    }

    // 统计各个位置的节点个数，以及根据权重排序
    function cmpDegree(a, b) {
        return a.degree - b.degree;
    }

    let locals = [];
    let maxPoints = 0;
    for (let ip in points) {
        let ttl = points[ip].ttl;
        if (locals[ttl] === undefined) {
            locals[ttl] = [];
        }
        locals[ttl].push({ "ip": ip, "degree": points[ip].degree });
    }
    for (let ttl in locals) {
        locals[ttl].sort(cmpDegree);
        maxPoints = Math.max(maxPoints, Object.keys(locals[ttl]).length);
    }

    // 计算每个节点所处位置，计算cx, cy存入points
    let verGapLen = maxPoints - 1;
    let horGapLen = Object.keys(locals).length - 1;
    let width = s["x_gap"] * horGapLen + s["margin_hor"] * 2 + s["max_radius"] * 2;
    let height = s["y_gap"] * (verGapLen + verGapLen % 2) + s["margin_ver"] * 2;

    if (width > s.width) s.width = width;
    else width = s.width;
    s.height = height + s["offset_ver"] - (verGapLen % 2) * s["y_gap"];

    let cx = width / 2 - s["x_gap"] * horGapLen / 2; // cx值随着ttl变化而变化

    for (let ttl in locals) {
        let sign = 1;                    // 控制节点一上一下分布；
        let cy = height / 2;             // cy值随着points变化而变化;
        for (let i in locals[ttl]) {
            let ip = locals[ttl][i].ip;
            points[ip]["cx"] = cx;
            points[ip]["cy"] = cy + Math.ceil(i / 2) * sign * s["y_gap"];
            sign = sign * -1;
        }
        cx += s["x_gap"];
    }

    // 根据points内得到的每个结点的cx,cy，以及path中的关系，绘图所需的边和节点数据
    let nodes = [], links = [];
    for (let ip in points) {
        points[ip]["ip"] = ip;
        if (infos[ip] === undefined) {
            points[ip]["asn"] = -1;
            points[ip]["addr"] = 'internal';
            points[ip]["is_broad"] = false;
            points[ip]["asn_name"] = 'Unknown'
        } else {
            points[ip]["asn"] = infos[ip].asn;
            points[ip]["addr"] = infos[ip].addr;
            points[ip]["is_abroad"] = infos[ip].is_abroad;
            points[ip]["asn_name"] = infos[ip].asn_name;
        }
        nodes.push(points[ip]);
    }
    let _record = [];
    for (const path of paths) {
        let _src = path[0];
        let _dst;
        for (let ttl in path) {
            if (ttl == 0) continue;
            let ip = path[ttl];
            if (ip == null) continue;
            _dst = ip;
            if (_record[_src + _dst] === undefined) {
                _record[_src + _dst] = true;
                let link = { "source": points[_src], "target": points[_dst] };
                links.push(link);
            }
            _src = _dst;
        }
    }

    let res = { "nodes": null, "links": null };
    res["nodes"] = nodes;
    res["links"] = links;

    return res
}
