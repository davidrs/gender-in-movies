// TODO: colour code by genre


var app = {
  genres: ['Action','Romance', 'Comedy'],
  movieData: [],

  start: function(){
    _(app.genres).each(function(genre){
      app.loadMovieData(genre).then(function(movieData){
        app.movieData = app.movieData.concat(movieData.results);

        app.loadCastData(genre).then(function(data){
          console.log('data',genre, data);
          app.chartVertical(data,'movie_name', genre, true);
          charts.drawAllMoviesAllCast(data,"department", genre +" Movies By Department", false);
        });
      });
    });

  },

  chartVertical: function(data, nestKey, genre, SHOW_IMAGES){
      charts.drawAllMoviesAllCast(data,nestKey, genre+" Full Credits", SHOW_IMAGES);
      charts.drawAllMoviesOnlyActors(data, nestKey, genre, SHOW_IMAGES);
      charts.drawAllMoviesOnlyCrew(data, nestKey, genre, SHOW_IMAGES);
  },

  loadCastData: function(genre){
    return $.get(genre+'castAry.json');
  },

  loadMovieData: function(genre){
    return $.get(genre+'movies.json');
  }
};

app.start();

var charts = {
  tooltip: null,

  drawAllMoviesOnlyActors: function(data, nestKey, genre, SHOW_IMAGES){
    data = _(data).filter(function(d){
      return d.department === "actor";
    });
    charts.drawAllMoviesAllCast(data,nestKey, genre + " Actors Only", SHOW_IMAGES);
  },

  drawAllMoviesOnlyCrew: function(data, nestKey,genre, SHOW_IMAGES){
    data = _(data).filter(function(d){
      return d.department !== "actor";
    });
    charts.drawAllMoviesAllCast(data, nestKey, genre + " Crew Only", SHOW_IMAGES);
  },

  drawAllMoviesAllCast: function(data,  nestKey, title, SHOW_IMAGES){
    // use 'nest' to get total number of male, female, and unkown.
    var nestData = d3.nest()
      .key(function(credit){ return credit[nestKey]; })
      .rollup(function(credits){
        var stats = {
          total: credits.length,
          movie_id: credits[0].movie_id
        };
        return _.extend(stats, _(credits).countBy(function(credit){
          return credit.gender;
        }));
      })
      .entries(data);

      charts.drawChart(nestData, title, SHOW_IMAGES);
  },

  drawChart: function(data, title, SHOW_IMAGES){
    var WIDTH = 600,
        HEIGHT = 600,
        PADDING = 40,
        xKey = 'male',
        yKey = 'female',
        sizeKey = 'total',
        colors = d3.scale.category20();

    var maxX = _.max(data, function(movie){ return movie.values[xKey]; }).values[xKey];
    var maxY = _.max(data, function(movie){ return movie.values[yKey]; }).values[yKey];
    var x = d3.scale.linear().domain([0,maxX]).range([PADDING,WIDTH-PADDING]);
    var y = d3.scale.linear().domain([0,maxX]).range([HEIGHT-PADDING, PADDING]);

    var svg = d3.select('body').append('svg').attr('width', WIDTH).attr('height',HEIGHT);
    charts.addImageDefs(svg, data, yKey);

    // add tooltip singelton if needed
    if(!charts.tooltip){
      charts.tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
    }

    var circles = svg.selectAll('g').data(data).enter().append('g').append('circle')
      .attr('cx', function(d,i){
        return x((d.values[xKey]? d.values[xKey] : 0 ));
      }).attr('cy', function(d,i){
        console.log('d.values[yKey]', d.values[yKey], d);
        return y((d.values[yKey] ? d.values[yKey] : 0 ));
      }).attr('r', function(d,i){
        return (SHOW_IMAGES ? 25 : Math.sqrt(d.values[sizeKey]));
      }).style('fill', function(d,i){
        var patternId = d.values.movie_id+('-'+Math.random()).substr(2,6);
        charts.createPattern(svg, d, x, y, xKey, yKey, patternId);
        return  (SHOW_IMAGES ? "url(#"+patternId+")" : colors(d.key));
      }).on("mouseover", function(d) {
        if(SHOW_IMAGES){
          d3.select(this).transition().duration(500)
            .attr("r",  36);
        }
          charts.tooltip.transition()
               .duration(200)
               .style("opacity", .9);
          charts.tooltip.html('<strong>'+d.key + "</strong><br/> " + Math.round(100*(d.values[yKey]?d.values[yKey]:0) / d.values.total) + "% female ")
               .style("left", (d3.event.pageX + 20) + "px")
               .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
          charts.tooltip.transition()
               .duration(500)
               .style("opacity", 0);

        if(SHOW_IMAGES){
          d3.select(this).transition().duration(500)
            .attr("r", 25);
        }
      })
        .append("title")
          .text(function(d) {return d.key;});


    charts.drawAxis(svg, x, y,  HEIGHT, PADDING);
    charts.drawTitle(svg, title, WIDTH, HEIGHT, PADDING);
    charts.drawMiddleLine(svg,x,y,WIDTH, HEIGHT, PADDING);
  },

  createPattern: function(svg, d, x, y, xKey, yKey, patternId){
    var defs = svg.select('.defs');
    var movieMatch = _(app.movieData).find(function(movie){return d.values.movie_id == movie.id });
      defs.append('svg:pattern')
        .attr('id', patternId)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('x', function(){
          return (d.values[xKey] ? x(d.values[xKey])-60: 0);
        })
        .attr('y', function(){
          return (d.values[yKey] ? y(d.values[yKey])-36: 0);
        })
        .attr('width', '130')
        .attr('height', '73')
        .append('svg:image')
        .attr('xlink:href', "https://image.tmdb.org/t/p/w130/"+ movieMatch.backdrop_path)
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 130)
        .attr('height', 73);
  },
  addImageDefs: function(svg, data, yKey){
     var defs = svg.append('svg:defs').attr('class', 'defs');
  },

  drawTitle: function(svg, title, WIDTH, HEIGHT, PADDING){
    svg.append("text")
      .attr("x", (WIDTH / 2))
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("text-decoration", "underline")
      .text(title);

    svg.append("text")
      .attr("x", 0)
      .attr("y", PADDING)
      .attr("text-anchor", "left")
      .style("font-size", "11px")
      .text("female");

    svg.append("text")
      .attr("x", WIDTH-PADDING)
      .attr("y", HEIGHT-PADDING+5)
      .attr("text-anchor", "left")
      .style("font-size", "11px")
      .text("male");
  },

  drawAxis: function(svg, x, y, HEIGHT, PADDING ){
    var xAxis = d3.svg.axis()
                  .scale(x)
                  .orient("bottom");
    var xAxisGroup = svg.append("g")
                      .attr("class", "axis")
                      .attr("transform", "translate(0,"+ (HEIGHT- PADDING) +")")
                      .call(xAxis);
    var yAxis = d3.svg.axis()
                  .scale(y)
                  .orient("left");
    var yAxisGroup = svg.append("g")
                      .attr("class", "axis")
                      .attr("transform", "translate("+ PADDING +",0)")
                       .call(yAxis);
  },

  drawMiddleLine: function(svg, x, y,WIDTH, HEIGHT, PADDING){
    svg.append('line')
      .attr("x1",PADDING)
      .attr("y1",HEIGHT-PADDING)
      .attr("x2",WIDTH-PADDING)
      .attr("y2", PADDING)
      .attr("stroke-width", 1)
      .attr("stroke", "purple");
  }
};
