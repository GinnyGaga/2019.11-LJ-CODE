/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
$(document).ready(function() {

    $(".click-title").mouseenter( function(    e){
        e.preventDefault();
        this.style.cursor="pointer";
    });
    $(".click-title").mousedown( function(event){
        event.preventDefault();
    });

    // Ugly code while this script is shared among several pages
    try{
        refreshHitsPerSecond(true);
    } catch(e){}
    try{
        refreshResponseTimeOverTime(true);
    } catch(e){}
    try{
        refreshResponseTimePercentiles();
    } catch(e){}
    $(".portlet-header").css("cursor", "auto");
});

var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

// Fixes time stamps
function fixTimeStamps(series, offset){
    $.each(series, function(index, item) {
        $.each(item.data, function(index, coord) {
            coord[0] += offset;
        });
    });
}

// Check if the specified jquery object is a graph
function isGraph(object){
    return object.data('plot') !== undefined;
}

/**
 * Export graph to a PNG
 */
function exportToPNG(graphName, target) {
    var plot = $("#"+graphName).data('plot');
    var flotCanvas = plot.getCanvas();
    var image = flotCanvas.toDataURL();
    image = image.replace("image/png", "image/octet-stream");
    
    var downloadAttrSupported = ("download" in document.createElement("a"));
    if(downloadAttrSupported === true) {
        target.download = graphName + ".png";
        target.href = image;
    }
    else {
        document.location.href = image;
    }
    
}

// Override the specified graph options to fit the requirements of an overview
function prepareOverviewOptions(graphOptions){
    var overviewOptions = {
        series: {
            shadowSize: 0,
            lines: {
                lineWidth: 1
            },
            points: {
                // Show points on overview only when linked graph does not show
                // lines
                show: getProperty('series.lines.show', graphOptions) == false,
                radius : 1
            }
        },
        xaxis: {
            ticks: 2,
            axisLabel: null
        },
        yaxis: {
            ticks: 2,
            axisLabel: null
        },
        legend: {
            show: false,
            container: null
        },
        grid: {
            hoverable: false
        },
        tooltip: false
    };
    return $.extend(true, {}, graphOptions, overviewOptions);
}

// Force axes boundaries using graph extra options
function prepareOptions(options, data) {
    options.canvas = true;
    var extraOptions = data.extraOptions;
    if(extraOptions !== undefined){
        var xOffset = options.xaxis.mode === "time" ? 28800000 : 0;
        var yOffset = options.yaxis.mode === "time" ? 28800000 : 0;

        if(!isNaN(extraOptions.minX))
        	options.xaxis.min = parseFloat(extraOptions.minX) + xOffset;
        
        if(!isNaN(extraOptions.maxX))
        	options.xaxis.max = parseFloat(extraOptions.maxX) + xOffset;
        
        if(!isNaN(extraOptions.minY))
        	options.yaxis.min = parseFloat(extraOptions.minY) + yOffset;
        
        if(!isNaN(extraOptions.maxY))
        	options.yaxis.max = parseFloat(extraOptions.maxY) + yOffset;
    }
}

// Filter, mark series and sort data
/**
 * @param data
 * @param noMatchColor if defined and true, series.color are not matched with index
 */
function prepareSeries(data, noMatchColor){
    var result = data.result;

    // Keep only series when needed
    if(seriesFilter && (!filtersOnlySampleSeries || result.supportsControllersDiscrimination)){
        // Insensitive case matching
        var regexp = new RegExp(seriesFilter, 'i');
        result.series = $.grep(result.series, function(series, index){
            return regexp.test(series.label);
        });
    }

    // Keep only controllers series when supported and needed
    if(result.supportsControllersDiscrimination && showControllersOnly){
        result.series = $.grep(result.series, function(series, index){
            return series.isController;
        });
    }

    // Sort data and mark series
    $.each(result.series, function(index, series) {
        series.data.sort(compareByXCoordinate);
        if(!(noMatchColor && noMatchColor===true)) {
	        series.color = index;
	    }
    });
}

// Set the zoom on the specified plot object
function zoomPlot(plot, xmin, xmax, ymin, ymax){
    var axes = plot.getAxes();
    // Override axes min and max options
    $.extend(true, axes, {
        xaxis: {
            options : { min: xmin, max: xmax }
        },
        yaxis: {
            options : { min: ymin, max: ymax }
        }
    });

    // Redraw the plot
    plot.setupGrid();
    plot.draw();
}

// Prepares DOM items to add zoom function on the specified graph
function setGraphZoomable(graphSelector, overviewSelector){
    var graph = $(graphSelector);
    var overview = $(overviewSelector);

    // Ignore mouse down event
    graph.bind("mousedown", function() { return false; });
    overview.bind("mousedown", function() { return false; });

    // Zoom on selection
    graph.bind("plotselected", function (event, ranges) {
        // clamp the zooming to prevent infinite zoom
        if (ranges.xaxis.to - ranges.xaxis.from < 0.00001) {
            ranges.xaxis.to = ranges.xaxis.from + 0.00001;
        }
        if (ranges.yaxis.to - ranges.yaxis.from < 0.00001) {
            ranges.yaxis.to = ranges.yaxis.from + 0.00001;
        }

        // Do the zooming
        var plot = graph.data('plot');
        zoomPlot(plot, ranges.xaxis.from, ranges.xaxis.to, ranges.yaxis.from, ranges.yaxis.to);
        plot.clearSelection();

        // Synchronize overview selection
        overview.data('plot').setSelection(ranges, true);
    });

    // Zoom linked graph on overview selection
    overview.bind("plotselected", function (event, ranges) {
        graph.data('plot').setSelection(ranges);
    });

    // Reset linked graph zoom when reseting overview selection
    overview.bind("plotunselected", function () {
        var overviewAxes = overview.data('plot').getAxes();
        zoomPlot(graph.data('plot'), overviewAxes.xaxis.min, overviewAxes.xaxis.max, overviewAxes.yaxis.min, overviewAxes.yaxis.max);
    });
}

var responseTimePercentilesInfos = {
        data: {"result": {"minY": 65.0, "minX": 0.0, "maxY": 9190.0, "series": [{"data": [[0.0, 65.0], [0.1, 124.0], [0.2, 135.0], [0.3, 153.0], [0.4, 179.0], [0.5, 197.0], [0.6, 217.0], [0.7, 228.0], [0.8, 241.0], [0.9, 258.0], [1.0, 274.0], [1.1, 283.0], [1.2, 290.0], [1.3, 296.0], [1.4, 305.0], [1.5, 310.0], [1.6, 315.0], [1.7, 321.0], [1.8, 325.0], [1.9, 330.0], [2.0, 336.0], [2.1, 342.0], [2.2, 348.0], [2.3, 352.0], [2.4, 357.0], [2.5, 359.0], [2.6, 362.0], [2.7, 366.0], [2.8, 369.0], [2.9, 374.0], [3.0, 378.0], [3.1, 381.0], [3.2, 384.0], [3.3, 386.0], [3.4, 390.0], [3.5, 395.0], [3.6, 396.0], [3.7, 399.0], [3.8, 401.0], [3.9, 404.0], [4.0, 406.0], [4.1, 409.0], [4.2, 411.0], [4.3, 414.0], [4.4, 415.0], [4.5, 418.0], [4.6, 419.0], [4.7, 422.0], [4.8, 425.0], [4.9, 428.0], [5.0, 430.0], [5.1, 432.0], [5.2, 433.0], [5.3, 436.0], [5.4, 437.0], [5.5, 439.0], [5.6, 440.0], [5.7, 443.0], [5.8, 444.0], [5.9, 446.0], [6.0, 447.0], [6.1, 448.0], [6.2, 449.0], [6.3, 450.0], [6.4, 452.0], [6.5, 453.0], [6.6, 455.0], [6.7, 456.0], [6.8, 457.0], [6.9, 460.0], [7.0, 460.0], [7.1, 462.0], [7.2, 463.0], [7.3, 464.0], [7.4, 466.0], [7.5, 466.0], [7.6, 467.0], [7.7, 468.0], [7.8, 469.0], [7.9, 470.0], [8.0, 471.0], [8.1, 472.0], [8.2, 473.0], [8.3, 474.0], [8.4, 475.0], [8.5, 475.0], [8.6, 476.0], [8.7, 477.0], [8.8, 478.0], [8.9, 479.0], [9.0, 481.0], [9.1, 481.0], [9.2, 482.0], [9.3, 484.0], [9.4, 485.0], [9.5, 485.0], [9.6, 487.0], [9.7, 488.0], [9.8, 489.0], [9.9, 490.0], [10.0, 491.0], [10.1, 492.0], [10.2, 493.0], [10.3, 494.0], [10.4, 496.0], [10.5, 497.0], [10.6, 498.0], [10.7, 498.0], [10.8, 500.0], [10.9, 502.0], [11.0, 502.0], [11.1, 503.0], [11.2, 504.0], [11.3, 505.0], [11.4, 507.0], [11.5, 508.0], [11.6, 508.0], [11.7, 510.0], [11.8, 511.0], [11.9, 512.0], [12.0, 513.0], [12.1, 514.0], [12.2, 515.0], [12.3, 516.0], [12.4, 517.0], [12.5, 518.0], [12.6, 519.0], [12.7, 520.0], [12.8, 520.0], [12.9, 521.0], [13.0, 522.0], [13.1, 522.0], [13.2, 522.0], [13.3, 523.0], [13.4, 524.0], [13.5, 525.0], [13.6, 526.0], [13.7, 527.0], [13.8, 527.0], [13.9, 528.0], [14.0, 529.0], [14.1, 530.0], [14.2, 531.0], [14.3, 532.0], [14.4, 533.0], [14.5, 535.0], [14.6, 536.0], [14.7, 537.0], [14.8, 538.0], [14.9, 539.0], [15.0, 540.0], [15.1, 541.0], [15.2, 542.0], [15.3, 543.0], [15.4, 543.0], [15.5, 545.0], [15.6, 545.0], [15.7, 546.0], [15.8, 547.0], [15.9, 548.0], [16.0, 549.0], [16.1, 550.0], [16.2, 551.0], [16.3, 552.0], [16.4, 553.0], [16.5, 554.0], [16.6, 554.0], [16.7, 555.0], [16.8, 556.0], [16.9, 557.0], [17.0, 558.0], [17.1, 558.0], [17.2, 560.0], [17.3, 560.0], [17.4, 562.0], [17.5, 563.0], [17.6, 563.0], [17.7, 564.0], [17.8, 565.0], [17.9, 566.0], [18.0, 567.0], [18.1, 568.0], [18.2, 569.0], [18.3, 570.0], [18.4, 571.0], [18.5, 572.0], [18.6, 574.0], [18.7, 575.0], [18.8, 576.0], [18.9, 577.0], [19.0, 578.0], [19.1, 580.0], [19.2, 581.0], [19.3, 582.0], [19.4, 583.0], [19.5, 584.0], [19.6, 585.0], [19.7, 586.0], [19.8, 587.0], [19.9, 588.0], [20.0, 590.0], [20.1, 591.0], [20.2, 592.0], [20.3, 594.0], [20.4, 595.0], [20.5, 596.0], [20.6, 598.0], [20.7, 599.0], [20.8, 600.0], [20.9, 600.0], [21.0, 601.0], [21.1, 602.0], [21.2, 603.0], [21.3, 604.0], [21.4, 605.0], [21.5, 606.0], [21.6, 607.0], [21.7, 609.0], [21.8, 610.0], [21.9, 610.0], [22.0, 611.0], [22.1, 613.0], [22.2, 614.0], [22.3, 614.0], [22.4, 616.0], [22.5, 617.0], [22.6, 619.0], [22.7, 620.0], [22.8, 621.0], [22.9, 623.0], [23.0, 624.0], [23.1, 625.0], [23.2, 627.0], [23.3, 628.0], [23.4, 629.0], [23.5, 631.0], [23.6, 632.0], [23.7, 633.0], [23.8, 634.0], [23.9, 636.0], [24.0, 638.0], [24.1, 641.0], [24.2, 643.0], [24.3, 645.0], [24.4, 647.0], [24.5, 648.0], [24.6, 650.0], [24.7, 651.0], [24.8, 652.0], [24.9, 654.0], [25.0, 655.0], [25.1, 656.0], [25.2, 657.0], [25.3, 659.0], [25.4, 660.0], [25.5, 661.0], [25.6, 662.0], [25.7, 662.0], [25.8, 664.0], [25.9, 664.0], [26.0, 665.0], [26.1, 666.0], [26.2, 667.0], [26.3, 667.0], [26.4, 668.0], [26.5, 669.0], [26.6, 670.0], [26.7, 671.0], [26.8, 672.0], [26.9, 673.0], [27.0, 674.0], [27.1, 676.0], [27.2, 677.0], [27.3, 678.0], [27.4, 680.0], [27.5, 681.0], [27.6, 683.0], [27.7, 684.0], [27.8, 686.0], [27.9, 687.0], [28.0, 689.0], [28.1, 691.0], [28.2, 692.0], [28.3, 693.0], [28.4, 696.0], [28.5, 698.0], [28.6, 700.0], [28.7, 701.0], [28.8, 702.0], [28.9, 704.0], [29.0, 705.0], [29.1, 706.0], [29.2, 708.0], [29.3, 710.0], [29.4, 711.0], [29.5, 711.0], [29.6, 713.0], [29.7, 714.0], [29.8, 715.0], [29.9, 715.0], [30.0, 716.0], [30.1, 717.0], [30.2, 717.0], [30.3, 718.0], [30.4, 719.0], [30.5, 720.0], [30.6, 721.0], [30.7, 721.0], [30.8, 722.0], [30.9, 723.0], [31.0, 724.0], [31.1, 725.0], [31.2, 726.0], [31.3, 727.0], [31.4, 728.0], [31.5, 729.0], [31.6, 730.0], [31.7, 731.0], [31.8, 732.0], [31.9, 732.0], [32.0, 733.0], [32.1, 734.0], [32.2, 735.0], [32.3, 735.0], [32.4, 736.0], [32.5, 737.0], [32.6, 738.0], [32.7, 739.0], [32.8, 740.0], [32.9, 740.0], [33.0, 741.0], [33.1, 742.0], [33.2, 742.0], [33.3, 744.0], [33.4, 745.0], [33.5, 745.0], [33.6, 746.0], [33.7, 746.0], [33.8, 748.0], [33.9, 749.0], [34.0, 750.0], [34.1, 751.0], [34.2, 752.0], [34.3, 753.0], [34.4, 754.0], [34.5, 755.0], [34.6, 755.0], [34.7, 756.0], [34.8, 757.0], [34.9, 758.0], [35.0, 759.0], [35.1, 760.0], [35.2, 760.0], [35.3, 761.0], [35.4, 763.0], [35.5, 763.0], [35.6, 764.0], [35.7, 765.0], [35.8, 766.0], [35.9, 767.0], [36.0, 768.0], [36.1, 769.0], [36.2, 771.0], [36.3, 772.0], [36.4, 773.0], [36.5, 775.0], [36.6, 776.0], [36.7, 777.0], [36.8, 779.0], [36.9, 780.0], [37.0, 781.0], [37.1, 782.0], [37.2, 783.0], [37.3, 784.0], [37.4, 785.0], [37.5, 786.0], [37.6, 787.0], [37.7, 788.0], [37.8, 789.0], [37.9, 790.0], [38.0, 791.0], [38.1, 792.0], [38.2, 792.0], [38.3, 794.0], [38.4, 795.0], [38.5, 795.0], [38.6, 796.0], [38.7, 797.0], [38.8, 798.0], [38.9, 798.0], [39.0, 799.0], [39.1, 800.0], [39.2, 800.0], [39.3, 801.0], [39.4, 802.0], [39.5, 803.0], [39.6, 804.0], [39.7, 804.0], [39.8, 805.0], [39.9, 806.0], [40.0, 808.0], [40.1, 809.0], [40.2, 810.0], [40.3, 811.0], [40.4, 812.0], [40.5, 814.0], [40.6, 815.0], [40.7, 815.0], [40.8, 817.0], [40.9, 818.0], [41.0, 820.0], [41.1, 821.0], [41.2, 823.0], [41.3, 825.0], [41.4, 826.0], [41.5, 827.0], [41.6, 829.0], [41.7, 831.0], [41.8, 833.0], [41.9, 834.0], [42.0, 835.0], [42.1, 836.0], [42.2, 838.0], [42.3, 841.0], [42.4, 843.0], [42.5, 844.0], [42.6, 845.0], [42.7, 847.0], [42.8, 848.0], [42.9, 849.0], [43.0, 849.0], [43.1, 850.0], [43.2, 852.0], [43.3, 853.0], [43.4, 855.0], [43.5, 857.0], [43.6, 858.0], [43.7, 860.0], [43.8, 861.0], [43.9, 863.0], [44.0, 864.0], [44.1, 865.0], [44.2, 867.0], [44.3, 868.0], [44.4, 869.0], [44.5, 870.0], [44.6, 871.0], [44.7, 873.0], [44.8, 874.0], [44.9, 876.0], [45.0, 877.0], [45.1, 880.0], [45.2, 881.0], [45.3, 884.0], [45.4, 886.0], [45.5, 888.0], [45.6, 890.0], [45.7, 891.0], [45.8, 895.0], [45.9, 897.0], [46.0, 898.0], [46.1, 902.0], [46.2, 905.0], [46.3, 908.0], [46.4, 912.0], [46.5, 916.0], [46.6, 918.0], [46.7, 921.0], [46.8, 927.0], [46.9, 933.0], [47.0, 936.0], [47.1, 938.0], [47.2, 941.0], [47.3, 944.0], [47.4, 947.0], [47.5, 952.0], [47.6, 954.0], [47.7, 957.0], [47.8, 960.0], [47.9, 964.0], [48.0, 966.0], [48.1, 970.0], [48.2, 974.0], [48.3, 977.0], [48.4, 980.0], [48.5, 985.0], [48.6, 990.0], [48.7, 997.0], [48.8, 999.0], [48.9, 1003.0], [49.0, 1006.0], [49.1, 1010.0], [49.2, 1013.0], [49.3, 1015.0], [49.4, 1020.0], [49.5, 1025.0], [49.6, 1031.0], [49.7, 1035.0], [49.8, 1042.0], [49.9, 1045.0], [50.0, 1049.0], [50.1, 1053.0], [50.2, 1059.0], [50.3, 1064.0], [50.4, 1067.0], [50.5, 1073.0], [50.6, 1075.0], [50.7, 1079.0], [50.8, 1081.0], [50.9, 1083.0], [51.0, 1085.0], [51.1, 1087.0], [51.2, 1089.0], [51.3, 1093.0], [51.4, 1095.0], [51.5, 1096.0], [51.6, 1097.0], [51.7, 1099.0], [51.8, 1101.0], [51.9, 1103.0], [52.0, 1105.0], [52.1, 1107.0], [52.2, 1109.0], [52.3, 1111.0], [52.4, 1113.0], [52.5, 1115.0], [52.6, 1118.0], [52.7, 1121.0], [52.8, 1122.0], [52.9, 1124.0], [53.0, 1125.0], [53.1, 1127.0], [53.2, 1129.0], [53.3, 1130.0], [53.4, 1131.0], [53.5, 1132.0], [53.6, 1133.0], [53.7, 1135.0], [53.8, 1136.0], [53.9, 1137.0], [54.0, 1137.0], [54.1, 1138.0], [54.2, 1140.0], [54.3, 1141.0], [54.4, 1141.0], [54.5, 1143.0], [54.6, 1144.0], [54.7, 1146.0], [54.8, 1147.0], [54.9, 1148.0], [55.0, 1149.0], [55.1, 1150.0], [55.2, 1151.0], [55.3, 1152.0], [55.4, 1153.0], [55.5, 1154.0], [55.6, 1156.0], [55.7, 1156.0], [55.8, 1157.0], [55.9, 1158.0], [56.0, 1159.0], [56.1, 1161.0], [56.2, 1162.0], [56.3, 1163.0], [56.4, 1164.0], [56.5, 1165.0], [56.6, 1166.0], [56.7, 1167.0], [56.8, 1169.0], [56.9, 1169.0], [57.0, 1172.0], [57.1, 1173.0], [57.2, 1175.0], [57.3, 1177.0], [57.4, 1178.0], [57.5, 1181.0], [57.6, 1182.0], [57.7, 1184.0], [57.8, 1185.0], [57.9, 1188.0], [58.0, 1190.0], [58.1, 1192.0], [58.2, 1194.0], [58.3, 1195.0], [58.4, 1197.0], [58.5, 1198.0], [58.6, 1200.0], [58.7, 1201.0], [58.8, 1203.0], [58.9, 1205.0], [59.0, 1207.0], [59.1, 1210.0], [59.2, 1213.0], [59.3, 1216.0], [59.4, 1220.0], [59.5, 1227.0], [59.6, 1235.0], [59.7, 1245.0], [59.8, 1277.0], [59.9, 1297.0], [60.0, 1326.0], [60.1, 1362.0], [60.2, 3070.0], [60.3, 3094.0], [60.4, 3109.0], [60.5, 3119.0], [60.6, 3126.0], [60.7, 3136.0], [60.8, 3147.0], [60.9, 3154.0], [61.0, 3159.0], [61.1, 3169.0], [61.2, 3173.0], [61.3, 3181.0], [61.4, 3185.0], [61.5, 3190.0], [61.6, 3194.0], [61.7, 3195.0], [61.8, 3198.0], [61.9, 3203.0], [62.0, 3205.0], [62.1, 3208.0], [62.2, 3212.0], [62.3, 3218.0], [62.4, 3221.0], [62.5, 3226.0], [62.6, 3229.0], [62.7, 3232.0], [62.8, 3236.0], [62.9, 3240.0], [63.0, 3243.0], [63.1, 3246.0], [63.2, 3248.0], [63.3, 3250.0], [63.4, 3253.0], [63.5, 3254.0], [63.6, 3256.0], [63.7, 3258.0], [63.8, 3259.0], [63.9, 3262.0], [64.0, 3263.0], [64.1, 3265.0], [64.2, 3267.0], [64.3, 3269.0], [64.4, 3270.0], [64.5, 3273.0], [64.6, 3276.0], [64.7, 3277.0], [64.8, 3278.0], [64.9, 3280.0], [65.0, 3282.0], [65.1, 3284.0], [65.2, 3286.0], [65.3, 3287.0], [65.4, 3290.0], [65.5, 3292.0], [65.6, 3295.0], [65.7, 3296.0], [65.8, 3298.0], [65.9, 3300.0], [66.0, 3302.0], [66.1, 3304.0], [66.2, 3306.0], [66.3, 3308.0], [66.4, 3313.0], [66.5, 3316.0], [66.6, 3319.0], [66.7, 3320.0], [66.8, 3323.0], [66.9, 3325.0], [67.0, 3329.0], [67.1, 3330.0], [67.2, 3332.0], [67.3, 3336.0], [67.4, 3338.0], [67.5, 3340.0], [67.6, 3342.0], [67.7, 3344.0], [67.8, 3346.0], [67.9, 3349.0], [68.0, 3356.0], [68.1, 3358.0], [68.2, 3361.0], [68.3, 3363.0], [68.4, 3366.0], [68.5, 3369.0], [68.6, 3370.0], [68.7, 3372.0], [68.8, 3373.0], [68.9, 3375.0], [69.0, 3377.0], [69.1, 3377.0], [69.2, 3380.0], [69.3, 3381.0], [69.4, 3382.0], [69.5, 3385.0], [69.6, 3387.0], [69.7, 3389.0], [69.8, 3392.0], [69.9, 3393.0], [70.0, 3394.0], [70.1, 3396.0], [70.2, 3399.0], [70.3, 3402.0], [70.4, 3405.0], [70.5, 3408.0], [70.6, 3410.0], [70.7, 3412.0], [70.8, 3415.0], [70.9, 3418.0], [71.0, 3420.0], [71.1, 3422.0], [71.2, 3424.0], [71.3, 3427.0], [71.4, 3428.0], [71.5, 3431.0], [71.6, 3432.0], [71.7, 3433.0], [71.8, 3437.0], [71.9, 3439.0], [72.0, 3441.0], [72.1, 3444.0], [72.2, 3447.0], [72.3, 3450.0], [72.4, 3452.0], [72.5, 3455.0], [72.6, 3458.0], [72.7, 3462.0], [72.8, 3463.0], [72.9, 3467.0], [73.0, 3469.0], [73.1, 3471.0], [73.2, 3474.0], [73.3, 3476.0], [73.4, 3481.0], [73.5, 3484.0], [73.6, 3487.0], [73.7, 3489.0], [73.8, 3491.0], [73.9, 3494.0], [74.0, 3498.0], [74.1, 3500.0], [74.2, 3503.0], [74.3, 3505.0], [74.4, 3506.0], [74.5, 3509.0], [74.6, 3511.0], [74.7, 3513.0], [74.8, 3517.0], [74.9, 3519.0], [75.0, 3520.0], [75.1, 3523.0], [75.2, 3524.0], [75.3, 3528.0], [75.4, 3530.0], [75.5, 3533.0], [75.6, 3535.0], [75.7, 3538.0], [75.8, 3540.0], [75.9, 3542.0], [76.0, 3543.0], [76.1, 3546.0], [76.2, 3549.0], [76.3, 3551.0], [76.4, 3554.0], [76.5, 3555.0], [76.6, 3557.0], [76.7, 3559.0], [76.8, 3560.0], [76.9, 3562.0], [77.0, 3563.0], [77.1, 3564.0], [77.2, 3566.0], [77.3, 3568.0], [77.4, 3569.0], [77.5, 3570.0], [77.6, 3572.0], [77.7, 3573.0], [77.8, 3575.0], [77.9, 3576.0], [78.0, 3577.0], [78.1, 3578.0], [78.2, 3580.0], [78.3, 3581.0], [78.4, 3583.0], [78.5, 3584.0], [78.6, 3586.0], [78.7, 3587.0], [78.8, 3590.0], [78.9, 3592.0], [79.0, 3594.0], [79.1, 3596.0], [79.2, 3597.0], [79.3, 3598.0], [79.4, 3600.0], [79.5, 3602.0], [79.6, 3604.0], [79.7, 3606.0], [79.8, 3608.0], [79.9, 3611.0], [80.0, 3612.0], [80.1, 3613.0], [80.2, 3615.0], [80.3, 3617.0], [80.4, 3618.0], [80.5, 3620.0], [80.6, 3622.0], [80.7, 3624.0], [80.8, 3627.0], [80.9, 3629.0], [81.0, 3631.0], [81.1, 3633.0], [81.2, 3635.0], [81.3, 3637.0], [81.4, 3641.0], [81.5, 3643.0], [81.6, 3646.0], [81.7, 3648.0], [81.8, 3650.0], [81.9, 3654.0], [82.0, 3656.0], [82.1, 3657.0], [82.2, 3660.0], [82.3, 3662.0], [82.4, 3664.0], [82.5, 3666.0], [82.6, 3668.0], [82.7, 3669.0], [82.8, 3671.0], [82.9, 3672.0], [83.0, 3673.0], [83.1, 3674.0], [83.2, 3676.0], [83.3, 3678.0], [83.4, 3680.0], [83.5, 3683.0], [83.6, 3685.0], [83.7, 3686.0], [83.8, 3689.0], [83.9, 3691.0], [84.0, 3693.0], [84.1, 3695.0], [84.2, 3697.0], [84.3, 3698.0], [84.4, 3700.0], [84.5, 3702.0], [84.6, 3704.0], [84.7, 3706.0], [84.8, 3708.0], [84.9, 3709.0], [85.0, 3711.0], [85.1, 3711.0], [85.2, 3713.0], [85.3, 3714.0], [85.4, 3715.0], [85.5, 3716.0], [85.6, 3717.0], [85.7, 3718.0], [85.8, 3719.0], [85.9, 3720.0], [86.0, 3722.0], [86.1, 3724.0], [86.2, 3724.0], [86.3, 3725.0], [86.4, 3727.0], [86.5, 3728.0], [86.6, 3730.0], [86.7, 3732.0], [86.8, 3733.0], [86.9, 3735.0], [87.0, 3737.0], [87.1, 3739.0], [87.2, 3741.0], [87.3, 3742.0], [87.4, 3743.0], [87.5, 3745.0], [87.6, 3747.0], [87.7, 3748.0], [87.8, 3750.0], [87.9, 3752.0], [88.0, 3754.0], [88.1, 3755.0], [88.2, 3756.0], [88.3, 3758.0], [88.4, 3760.0], [88.5, 3761.0], [88.6, 3762.0], [88.7, 3763.0], [88.8, 3765.0], [88.9, 3767.0], [89.0, 3769.0], [89.1, 3770.0], [89.2, 3771.0], [89.3, 3773.0], [89.4, 3774.0], [89.5, 3775.0], [89.6, 3777.0], [89.7, 3779.0], [89.8, 3779.0], [89.9, 3781.0], [90.0, 3782.0], [90.1, 3783.0], [90.2, 3785.0], [90.3, 3785.0], [90.4, 3787.0], [90.5, 3789.0], [90.6, 3790.0], [90.7, 3793.0], [90.8, 3797.0], [90.9, 3798.0], [91.0, 3799.0], [91.1, 3802.0], [91.2, 3803.0], [91.3, 3804.0], [91.4, 3805.0], [91.5, 3807.0], [91.6, 3809.0], [91.7, 3810.0], [91.8, 3811.0], [91.9, 3813.0], [92.0, 3814.0], [92.1, 3815.0], [92.2, 3817.0], [92.3, 3818.0], [92.4, 3820.0], [92.5, 3821.0], [92.6, 3824.0], [92.7, 3825.0], [92.8, 3827.0], [92.9, 3829.0], [93.0, 3830.0], [93.1, 3831.0], [93.2, 3833.0], [93.3, 3834.0], [93.4, 3836.0], [93.5, 3839.0], [93.6, 3841.0], [93.7, 3843.0], [93.8, 3844.0], [93.9, 3846.0], [94.0, 3847.0], [94.1, 3849.0], [94.2, 3852.0], [94.3, 3855.0], [94.4, 3857.0], [94.5, 3859.0], [94.6, 3860.0], [94.7, 3863.0], [94.8, 3865.0], [94.9, 3866.0], [95.0, 3867.0], [95.1, 3869.0], [95.2, 3871.0], [95.3, 3874.0], [95.4, 3875.0], [95.5, 3876.0], [95.6, 3879.0], [95.7, 3881.0], [95.8, 3885.0], [95.9, 3887.0], [96.0, 3891.0], [96.1, 3893.0], [96.2, 3896.0], [96.3, 3899.0], [96.4, 3901.0], [96.5, 3904.0], [96.6, 3908.0], [96.7, 3914.0], [96.8, 3917.0], [96.9, 3923.0], [97.0, 3927.0], [97.1, 3933.0], [97.2, 3937.0], [97.3, 3940.0], [97.4, 3943.0], [97.5, 3945.0], [97.6, 3949.0], [97.7, 3954.0], [97.8, 3957.0], [97.9, 3963.0], [98.0, 3970.0], [98.1, 3976.0], [98.2, 3983.0], [98.3, 3992.0], [98.4, 4095.0], [98.5, 4226.0], [98.6, 9063.0], [98.7, 9068.0], [98.8, 9072.0], [98.9, 9076.0], [99.0, 9085.0], [99.1, 9092.0], [99.2, 9104.0], [99.3, 9110.0], [99.4, 9116.0], [99.5, 9131.0], [99.6, 9135.0], [99.7, 9143.0], [99.8, 9154.0], [99.9, 9169.0], [100.0, 9190.0]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Response Time Percentiles"}},
        getOptions: function() {
            return {
                series: {
                    points: { show: false }
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentiles'
                },
                xaxis: {
                    tickDecimals: 1,
                    axisLabel: "Percentiles",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Percentile value in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : %x.2 percentile was %y ms"
                },
                selection: { mode: "xy" },
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentiles"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesPercentiles"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesPercentiles"), dataset, prepareOverviewOptions(options));
        }
};

// Response times percentiles
function refreshResponseTimePercentiles() {
    var infos = responseTimePercentilesInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimesPercentiles"))){
        infos.createGraph();
    } else {
        var choiceContainer = $("#choicesResponseTimePercentiles");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesPercentiles", "#overviewResponseTimesPercentiles");
        $('#bodyResponseTimePercentiles .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimeDistributionInfos = {
        data: {"result": {"minY": 5.0, "minX": 0.0, "maxY": 1051.0, "series": [{"data": [[0.0, 5.0], [9100.0, 86.0], [9000.0, 55.0], [600.0, 784.0], [700.0, 1051.0], [800.0, 693.0], [900.0, 279.0], [1000.0, 293.0], [1100.0, 683.0], [1200.0, 135.0], [1300.0, 19.0], [100.0, 46.0], [3000.0, 23.0], [3100.0, 147.0], [200.0, 84.0], [3200.0, 405.0], [3300.0, 434.0], [3400.0, 384.0], [3500.0, 534.0], [3600.0, 496.0], [3700.0, 666.0], [3800.0, 533.0], [3900.0, 198.0], [4000.0, 10.0], [4100.0, 6.0], [4200.0, 11.0], [300.0, 238.0], [400.0, 707.0], [500.0, 995.0]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 100, "maxX": 9100.0, "title": "Response Time Distribution"}},
        getOptions: function() {
            var granularity = this.data.result.granularity;
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    barWidth: this.data.result.granularity
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " responses for " + label + " were between " + xval + " and " + (xval + granularity) + " ms";
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimeDistribution"), prepareData(data.result.series, $("#choicesResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshResponseTimeDistribution() {
    var infos = responseTimeDistributionInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var syntheticResponseTimeDistributionInfos = {
        data: {"result": {"minY": 1086.0, "minX": 0.0, "ticks": [[0, "Requests having \nresponse time <= 500ms"], [1, "Requests having \nresponse time > 500ms and <= 1,500ms"], [2, "Requests having \nresponse time > 1,500ms"], [3, "Requests in error"]], "maxY": 4926.0, "series": [{"data": [[1.0, 4926.0]], "isOverall": false, "label": "Requests having \nresponse time > 500ms and <= 1,500ms", "isController": false}, {"data": [[0.0, 1086.0]], "isOverall": false, "label": "Requests having \nresponse time <= 500ms", "isController": false}, {"data": [[2.0, 3988.0]], "isOverall": false, "label": "Requests having \nresponse time > 1,500ms", "isController": false}], "supportsControllersDiscrimination": false, "maxX": 2.0, "title": "Synthetic Response Times Distribution"}},
        getOptions: function() {
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendSyntheticResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times ranges",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                    tickLength:0,
                    min:-0.5,
                    max:3.5
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    align: "center",
                    barWidth: 0.25,
                    fill:.75
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " " + label;
                    }
                },
                colors: ["#9ACD32", "yellow", "orange", "#FF6347"]                
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            options.xaxis.ticks = data.result.ticks;
            $.plot($("#flotSyntheticResponseTimeDistribution"), prepareData(data.result.series, $("#choicesSyntheticResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshSyntheticResponseTimeDistribution() {
    var infos = syntheticResponseTimeDistributionInfos;
    prepareSeries(infos.data, true);
    if (isGraph($("#flotSyntheticResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerSyntheticResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var activeThreadsOverTimeInfos = {
        data: {"result": {"minY": 63.24557522123895, "minX": 1.57477668E12, "maxY": 100.0, "series": [{"data": [[1.57477686E12, 100.0], [1.57477668E12, 100.0], [1.57477698E12, 100.0], [1.5747768E12, 100.0], [1.5747771E12, 63.24557522123895], [1.57477692E12, 100.0], [1.57477674E12, 100.0], [1.57477704E12, 98.8997650743931]], "isOverall": false, "label": "01登录", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.5747771E12, "title": "Active Threads Over Time"}},
        getOptions: function() {
            return {
                series: {
                    stack: true,
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 6,
                    show: true,
                    container: '#legendActiveThreadsOverTime'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                selection: {
                    mode: 'xy'
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : At %x there were %y active threads"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesActiveThreadsOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotActiveThreadsOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewActiveThreadsOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Active Threads Over Time
function refreshActiveThreadsOverTime(fixTimestamps) {
    var infos = activeThreadsOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotActiveThreadsOverTime"))) {
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesActiveThreadsOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotActiveThreadsOverTime", "#overviewActiveThreadsOverTime");
        $('#footerActiveThreadsOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var timeVsThreadsInfos = {
        data: {"result": {"minY": 65.0, "minX": 1.0, "maxY": 7719.499999999999, "series": [{"data": [[2.0, 1568.0], [3.0, 69.5], [4.0, 65.0], [5.0, 3071.0], [6.0, 3066.0], [7.0, 126.66666666666667], [8.0, 122.33333333333333], [9.0, 113.0], [10.0, 1582.5], [11.0, 3071.0], [12.0, 1144.3333333333335], [13.0, 179.0], [14.0, 178.0], [15.0, 167.0], [16.0, 1616.6666666666667], [17.0, 1949.4], [18.0, 234.0], [19.0, 221.5], [20.0, 219.0], [21.0, 2228.3333333333335], [22.0, 3212.6], [23.0, 1662.0], [24.0, 3165.5], [25.0, 434.2], [26.0, 3132.3333333333335], [27.0, 3100.0], [28.0, 3095.0], [29.0, 241.0], [30.0, 233.0], [31.0, 231.0], [33.0, 3404.0], [32.0, 226.0], [35.0, 1788.0], [34.0, 1799.8333333333335], [37.0, 3363.0], [36.0, 3374.75], [39.0, 3356.4], [38.0, 3364.0], [41.0, 3313.0], [40.0, 3340.75], [43.0, 376.0], [42.0, 380.0], [45.0, 368.0], [44.0, 369.5], [46.0, 365.5], [49.0, 342.6666666666667], [48.0, 354.0], [51.0, 300.5], [50.0, 337.0], [53.0, 3155.5], [52.0, 815.4], [55.0, 1485.0], [54.0, 3146.0], [57.0, 1663.3333333333333], [56.0, 654.0], [59.0, 647.0], [58.0, 648.0], [61.0, 646.0], [60.0, 648.3333333333334], [63.0, 2155.0], [62.0, 642.6666666666666], [67.0, 3401.125], [66.0, 2255.52], [65.0, 625.0], [64.0, 3664.0], [71.0, 460.0], [70.0, 466.2], [69.0, 472.0], [68.0, 1241.8666666666668], [75.0, 3194.6666666666665], [74.0, 1585.5238095238094], [73.0, 454.0], [72.0, 456.0], [79.0, 1026.8666666666668], [78.0, 609.5], [77.0, 1452.3333333333335], [76.0, 3163.0], [83.0, 7719.499999999999], [82.0, 3579.5714285714284], [81.0, 2847.789473684211], [80.0, 585.5], [87.0, 995.5882352941175], [86.0, 488.6666666666667], [85.0, 494.5], [84.0, 6239.666666666666], [91.0, 3772.3333333333335], [90.0, 2770.3333333333335], [89.0, 1595.741935483871], [88.0, 3185.0], [95.0, 2466.633027522937], [94.0, 437.7], [93.0, 474.5], [92.0, 2473.9322033898297], [99.0, 3486.0], [98.0, 1644.8500000000004], [97.0, 2087.5540540540537], [96.0, 2253.454545454545], [100.0, 1945.6276433398707], [1.0, 3071.0]], "isOverall": false, "label": "HTTP请求", "isController": false}, {"data": [[98.19819999999997, 1947.8396999999961]], "isOverall": false, "label": "HTTP请求-Aggregated", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Time VS Threads"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: { noColumns: 2,show: true, container: '#legendTimeVsThreads' },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s: At %x.2 active threads, Average response time was %y.2 ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesTimeVsThreads"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotTimesVsThreads"), dataset, options);
            // setup overview
            $.plot($("#overviewTimesVsThreads"), dataset, prepareOverviewOptions(options));
        }
};

// Time vs threads
function refreshTimeVsThreads(){
    var infos = timeVsThreadsInfos;
    prepareSeries(infos.data);
    if(isGraph($("#flotTimesVsThreads"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTimeVsThreads");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTimesVsThreads", "#overviewTimesVsThreads");
        $('#footerTimeVsThreads .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var bytesThroughputOverTimeInfos = {
        data : {"result": {"minY": 1883.35, "minX": 1.57477668E12, "maxY": 17513.133333333335, "series": [{"data": [[1.57477686E12, 14314.333333333334], [1.57477668E12, 17513.133333333335], [1.57477698E12, 14394.166666666666], [1.5747768E12, 14827.883333333333], [1.5747771E12, 5027.916666666667], [1.57477692E12, 14415.25], [1.57477674E12, 16476.683333333334], [1.57477704E12, 14205.0]], "isOverall": false, "label": "Bytes received per second", "isController": false}, {"data": [[1.57477686E12, 5362.5], [1.57477668E12, 6556.55], [1.57477698E12, 5391.666666666667], [1.5747768E12, 5558.333333333333], [1.5747771E12, 1883.35], [1.57477692E12, 5400.0], [1.57477674E12, 6175.0], [1.57477704E12, 5320.833333333333]], "isOverall": false, "label": "Bytes sent per second", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.5747771E12, "title": "Bytes Throughput Over Time"}},
        getOptions : function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity) ,
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Bytes / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendBytesThroughputOverTime'
                },
                selection: {
                    mode: "xy"
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y"
                }
            };
        },
        createGraph : function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesBytesThroughputOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotBytesThroughputOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewBytesThroughputOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Bytes throughput Over Time
function refreshBytesThroughputOverTime(fixTimestamps) {
    var infos = bytesThroughputOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotBytesThroughputOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesBytesThroughputOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotBytesThroughputOverTime", "#overviewBytesThroughputOverTime");
        $('#footerBytesThroughputOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimesOverTimeInfos = {
        data: {"result": {"minY": 1119.8282636248405, "minX": 1.57477668E12, "maxY": 2262.163580246917, "series": [{"data": [[1.57477686E12, 2047.9114219114213], [1.57477668E12, 1119.8282636248405], [1.57477698E12, 2261.394899536322], [1.5747768E12, 2171.95277361319], [1.5747771E12, 2012.619469026547], [1.57477692E12, 2262.163580246917], [1.57477674E12, 1863.9197031039112], [1.57477704E12, 2073.781519185592]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.5747771E12, "title": "Response Time Over Time"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average response time was %y ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Times Over Time
function refreshResponseTimeOverTime(fixTimestamps) {
    var infos = responseTimesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotResponseTimesOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesOverTime", "#overviewResponseTimesOverTime");
        $('#footerResponseTimesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var latenciesOverTimeInfos = {
        data: {"result": {"minY": 1119.8086185044338, "minX": 1.57477668E12, "maxY": 2262.1574074074106, "series": [{"data": [[1.57477686E12, 2047.8997668997622], [1.57477668E12, 1119.8086185044338], [1.57477698E12, 2261.3894899536313], [1.5747768E12, 2171.9482758620716], [1.5747771E12, 2012.619469026547], [1.57477692E12, 2262.1574074074106], [1.57477674E12, 1863.908232118758], [1.57477704E12, 2073.780736100231]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.5747771E12, "title": "Latencies Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response latencies in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendLatenciesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average latency was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesLatenciesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotLatenciesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewLatenciesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Latencies Over Time
function refreshLatenciesOverTime(fixTimestamps) {
    var infos = latenciesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotLatenciesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesLatenciesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotLatenciesOverTime", "#overviewLatenciesOverTime");
        $('#footerLatenciesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var connectTimeOverTimeInfos = {
        data: {"result": {"minY": 154.04309252217985, "minX": 1.57477668E12, "maxY": 1702.486111111112, "series": [{"data": [[1.57477686E12, 1464.9696969696972], [1.57477668E12, 154.04309252217985], [1.57477698E12, 1676.9737248840804], [1.5747768E12, 1576.0517241379289], [1.5747771E12, 1608.2278761061964], [1.57477692E12, 1702.486111111112], [1.57477674E12, 1243.1093117408914], [1.57477704E12, 1521.8363351605317]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.5747771E12, "title": "Connect Time Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getConnectTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average Connect Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendConnectTimeOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average connect time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesConnectTimeOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotConnectTimeOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewConnectTimeOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Connect Time Over Time
function refreshConnectTimeOverTime(fixTimestamps) {
    var infos = connectTimeOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotConnectTimeOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesConnectTimeOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotConnectTimeOverTime", "#overviewConnectTimeOverTime");
        $('#footerConnectTimeOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var responseTimePercentilesOverTimeInfos = {
        data: {"result": {"minY": 65.0, "minX": 1.57477668E12, "maxY": 9190.0, "series": [{"data": [[1.57477686E12, 3985.0], [1.57477668E12, 4130.0], [1.57477698E12, 9182.0], [1.5747768E12, 9110.0], [1.5747771E12, 9145.0], [1.57477692E12, 9190.0], [1.57477674E12, 9169.0], [1.57477704E12, 9136.0]], "isOverall": false, "label": "Max", "isController": false}, {"data": [[1.57477686E12, 182.0], [1.57477668E12, 102.0], [1.57477698E12, 178.0], [1.5747768E12, 164.0], [1.5747771E12, 65.0], [1.57477692E12, 140.0], [1.57477674E12, 142.0], [1.57477704E12, 197.0]], "isOverall": false, "label": "Min", "isController": false}, {"data": [[1.57477686E12, 3759.8], [1.57477668E12, 1208.0], [1.57477698E12, 3792.8], [1.5747768E12, 3757.5], [1.5747771E12, 3782.0], [1.57477692E12, 3777.0], [1.57477674E12, 3585.4000000000005], [1.57477704E12, 3785.1000000000004]], "isOverall": false, "label": "90th percentile", "isController": false}, {"data": [[1.57477686E12, 9067.18], [1.57477668E12, 3730.2500000000045], [1.57477698E12, 9085.0], [1.5747768E12, 9076.05], [1.5747771E12, 9085.0], [1.57477692E12, 9075.0], [1.57477674E12, 9089.0], [1.57477704E12, 9083.0]], "isOverall": false, "label": "99th percentile", "isController": false}, {"data": [[1.57477686E12, 3847.8999999999996], [1.57477668E12, 1313.1499999999999], [1.57477698E12, 3876.0], [1.5747768E12, 3856.25], [1.5747771E12, 3867.949999999999], [1.57477692E12, 3858.0999999999995], [1.57477674E12, 3806.95], [1.57477704E12, 3870.0]], "isOverall": false, "label": "95th percentile", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.5747771E12, "title": "Response Time Percentiles Over Time (successful requests only)"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentilesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Response time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentilesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimePercentilesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimePercentilesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Time Percentiles Over Time
function refreshResponseTimePercentilesOverTime(fixTimestamps) {
    var infos = responseTimePercentilesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotResponseTimePercentilesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimePercentilesOverTime", "#overviewResponseTimePercentilesOverTime");
        $('#footerResponseTimePercentilesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var responseTimeVsRequestInfos = {
    data: {"result": {"minY": 791.5, "minX": 7.0, "maxY": 1107.0, "series": [{"data": [[21.0, 896.5], [22.0, 865.0], [24.0, 884.5], [26.0, 1107.0], [7.0, 791.5]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 26.0, "title": "Response Time Vs Request"}},
    getOptions: function() {
        return {
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Response Time in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: {
                noColumns: 2,
                show: true,
                container: '#legendResponseTimeVsRequest'
            },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesResponseTimeVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotResponseTimeVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewResponseTimeVsRequest"), dataset, prepareOverviewOptions(options));

    }
};

// Response Time vs Request
function refreshResponseTimeVsRequest() {
    var infos = responseTimeVsRequestInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeVsRequest"))){
        infos.create();
    }else{
        var choiceContainer = $("#choicesResponseTimeVsRequest");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimeVsRequest", "#overviewResponseTimeVsRequest");
        $('#footerResponseRimeVsRequest .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var latenciesVsRequestInfos = {
    data: {"result": {"minY": 791.5, "minX": 7.0, "maxY": 1107.0, "series": [{"data": [[21.0, 896.5], [22.0, 865.0], [24.0, 884.5], [26.0, 1107.0], [7.0, 791.5]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 26.0, "title": "Latencies Vs Request"}},
    getOptions: function() {
        return{
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Latency in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: { noColumns: 2,show: true, container: '#legendLatencyVsRequest' },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesLatencyVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotLatenciesVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewLatenciesVsRequest"), dataset, prepareOverviewOptions(options));
    }
};

// Latencies vs Request
function refreshLatenciesVsRequest() {
        var infos = latenciesVsRequestInfos;
        prepareSeries(infos.data);
        if(isGraph($("#flotLatenciesVsRequest"))){
            infos.createGraph();
        }else{
            var choiceContainer = $("#choicesLatencyVsRequest");
            createLegend(choiceContainer, infos);
            infos.createGraph();
            setGraphZoomable("#flotLatenciesVsRequest", "#overviewLatenciesVsRequest");
            $('#footerLatenciesVsRequest .legendColorBox > div').each(function(i){
                $(this).clone().prependTo(choiceContainer.find("li").eq(i));
            });
        }
};

var hitsPerSecondInfos = {
        data: {"result": {"minY": 6.633333333333334, "minX": 1.57477668E12, "maxY": 27.816666666666666, "series": [{"data": [[1.57477686E12, 21.716666666666665], [1.57477668E12, 27.816666666666666], [1.57477698E12, 21.366666666666667], [1.5747768E12, 22.033333333333335], [1.5747771E12, 6.633333333333334], [1.57477692E12, 21.383333333333333], [1.57477674E12, 23.833333333333332], [1.57477704E12, 21.883333333333333]], "isOverall": false, "label": "hitsPerSecond", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.5747771E12, "title": "Hits Per Second"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of hits / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendHitsPerSecond"
                },
                selection: {
                    mode : 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y.2 hits/sec"
                }
            };
        },
        createGraph: function createGraph() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesHitsPerSecond"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotHitsPerSecond"), dataset, options);
            // setup overview
            $.plot($("#overviewHitsPerSecond"), dataset, prepareOverviewOptions(options));
        }
};

// Hits per second
function refreshHitsPerSecond(fixTimestamps) {
    var infos = hitsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if (isGraph($("#flotHitsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesHitsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotHitsPerSecond", "#overviewHitsPerSecond");
        $('#footerHitsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var codesPerSecondInfos = {
        data: {"result": {"minY": 7.533333333333333, "minX": 1.57477668E12, "maxY": 26.3, "series": [{"data": [[1.57477686E12, 21.45], [1.57477668E12, 26.3], [1.57477698E12, 21.566666666666666], [1.5747768E12, 22.233333333333334], [1.5747771E12, 7.533333333333333], [1.57477692E12, 21.6], [1.57477674E12, 24.7], [1.57477704E12, 21.283333333333335]], "isOverall": false, "label": "200", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.5747771E12, "title": "Codes Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendCodesPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "Number of Response Codes %s at %x was %y.2 responses / sec"
                }
            };
        },
    createGraph: function() {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesCodesPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotCodesPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewCodesPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Codes per second
function refreshCodesPerSecond(fixTimestamps) {
    var infos = codesPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotCodesPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesCodesPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotCodesPerSecond", "#overviewCodesPerSecond");
        $('#footerCodesPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var transactionsPerSecondInfos = {
        data: {"result": {"minY": 7.533333333333333, "minX": 1.57477668E12, "maxY": 26.3, "series": [{"data": [[1.57477686E12, 21.45], [1.57477668E12, 26.3], [1.57477698E12, 21.566666666666666], [1.5747768E12, 22.233333333333334], [1.5747771E12, 7.533333333333333], [1.57477692E12, 21.6], [1.57477674E12, 24.7], [1.57477704E12, 21.283333333333335]], "isOverall": false, "label": "HTTP请求-success", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.5747771E12, "title": "Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTransactionsPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                }
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTransactionsPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTransactionsPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewTransactionsPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Transactions per second
function refreshTransactionsPerSecond(fixTimestamps) {
    var infos = transactionsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotTransactionsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTransactionsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTransactionsPerSecond", "#overviewTransactionsPerSecond");
        $('#footerTransactionsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

// Collapse the graph matching the specified DOM element depending the collapsed
// status
function collapse(elem, collapsed){
    if(collapsed){
        $(elem).parent().find(".fa-chevron-up").removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
        $(elem).parent().find(".fa-chevron-down").removeClass("fa-chevron-down").addClass("fa-chevron-up");
        if (elem.id == "bodyBytesThroughputOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshBytesThroughputOverTime(true);
            }
            document.location.href="#bytesThroughputOverTime";
        } else if (elem.id == "bodyLatenciesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesOverTime(true);
            }
            document.location.href="#latenciesOverTime";
        } else if (elem.id == "bodyConnectTimeOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshConnectTimeOverTime(true);
            }
            document.location.href="#connectTimeOverTime";
        } else if (elem.id == "bodyResponseTimePercentilesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimePercentilesOverTime(true);
            }
            document.location.href="#responseTimePercentilesOverTime";
        } else if (elem.id == "bodyResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeDistribution();
            }
            document.location.href="#responseTimeDistribution" ;
        } else if (elem.id == "bodySyntheticResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshSyntheticResponseTimeDistribution();
            }
            document.location.href="#syntheticResponseTimeDistribution" ;
        } else if (elem.id == "bodyActiveThreadsOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshActiveThreadsOverTime(true);
            }
            document.location.href="#activeThreadsOverTime";
        } else if (elem.id == "bodyTimeVsThreads") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTimeVsThreads();
            }
            document.location.href="#timeVsThreads" ;
        } else if (elem.id == "bodyCodesPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCodesPerSecond(true);
            }
            document.location.href="#codesPerSecond";
        } else if (elem.id == "bodyTransactionsPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTransactionsPerSecond(true);
            }
            document.location.href="#transactionsPerSecond";
        } else if (elem.id == "bodyResponseTimeVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeVsRequest();
            }
            document.location.href="#responseTimeVsRequest";
        } else if (elem.id == "bodyLatenciesVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesVsRequest();
            }
            document.location.href="#latencyVsRequest";
        }
    }
}

// Collapse
$(function() {
        $('.collapse').on('shown.bs.collapse', function(){
            collapse(this, false);
        }).on('hidden.bs.collapse', function(){
            collapse(this, true);
        });
});

$(function() {
    $(".glyphicon").mousedown( function(event){
        var tmp = $('.in:not(ul)');
        tmp.parent().parent().parent().find(".fa-chevron-up").removeClass("fa-chevron-down").addClass("fa-chevron-down");
        tmp.removeClass("in");
        tmp.addClass("out");
    });
});

/*
 * Activates or deactivates all series of the specified graph (represented by id parameter)
 * depending on checked argument.
 */
function toggleAll(id, checked){
    var placeholder = document.getElementById(id);

    var cases = $(placeholder).find(':checkbox');
    cases.prop('checked', checked);
    $(cases).parent().children().children().toggleClass("legend-disabled", !checked);

    var choiceContainer;
    if ( id == "choicesBytesThroughputOverTime"){
        choiceContainer = $("#choicesBytesThroughputOverTime");
        refreshBytesThroughputOverTime(false);
    } else if(id == "choicesResponseTimesOverTime"){
        choiceContainer = $("#choicesResponseTimesOverTime");
        refreshResponseTimeOverTime(false);
    } else if ( id == "choicesLatenciesOverTime"){
        choiceContainer = $("#choicesLatenciesOverTime");
        refreshLatenciesOverTime(false);
    } else if ( id == "choicesConnectTimeOverTime"){
        choiceContainer = $("#choicesConnectTimeOverTime");
        refreshConnectTimeOverTime(false);
    } else if ( id == "responseTimePercentilesOverTime"){
        choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        refreshResponseTimePercentilesOverTime(false);
    } else if ( id == "choicesResponseTimePercentiles"){
        choiceContainer = $("#choicesResponseTimePercentiles");
        refreshResponseTimePercentiles();
    } else if(id == "choicesActiveThreadsOverTime"){
        choiceContainer = $("#choicesActiveThreadsOverTime");
        refreshActiveThreadsOverTime(false);
    } else if ( id == "choicesTimeVsThreads"){
        choiceContainer = $("#choicesTimeVsThreads");
        refreshTimeVsThreads();
    } else if ( id == "choicesSyntheticResponseTimeDistribution"){
        choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        refreshSyntheticResponseTimeDistribution();
    } else if ( id == "choicesResponseTimeDistribution"){
        choiceContainer = $("#choicesResponseTimeDistribution");
        refreshResponseTimeDistribution();
    } else if ( id == "choicesHitsPerSecond"){
        choiceContainer = $("#choicesHitsPerSecond");
        refreshHitsPerSecond(false);
    } else if(id == "choicesCodesPerSecond"){
        choiceContainer = $("#choicesCodesPerSecond");
        refreshCodesPerSecond(false);
    } else if ( id == "choicesTransactionsPerSecond"){
        choiceContainer = $("#choicesTransactionsPerSecond");
        refreshTransactionsPerSecond(false);
    } else if ( id == "choicesResponseTimeVsRequest"){
        choiceContainer = $("#choicesResponseTimeVsRequest");
        refreshResponseTimeVsRequest();
    } else if ( id == "choicesLatencyVsRequest"){
        choiceContainer = $("#choicesLatencyVsRequest");
        refreshLatenciesVsRequest();
    }
    var color = checked ? "black" : "#818181";
    choiceContainer.find("label").each(function(){
        this.style.color = color;
    });
}

// Unchecks all boxes for "Hide all samples" functionality
function uncheckAll(id){
    toggleAll(id, false);
}

// Checks all boxes for "Show all samples" functionality
function checkAll(id){
    toggleAll(id, true);
}

// Prepares data to be consumed by plot plugins
function prepareData(series, choiceContainer, customizeSeries){
    var datasets = [];

    // Add only selected series to the data set
    choiceContainer.find("input:checked").each(function (index, item) {
        var key = $(item).attr("name");
        var i = 0;
        var size = series.length;
        while(i < size && series[i].label != key)
            i++;
        if(i < size){
            var currentSeries = series[i];
            datasets.push(currentSeries);
            if(customizeSeries)
                customizeSeries(currentSeries);
        }
    });
    return datasets;
}

/*
 * Ignore case comparator
 */
function sortAlphaCaseless(a,b){
    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
};

/*
 * Creates a legend in the specified element with graph information
 */
function createLegend(choiceContainer, infos) {
    // Sort series by name
    var keys = [];
    $.each(infos.data.result.series, function(index, series){
        keys.push(series.label);
    });
    keys.sort(sortAlphaCaseless);

    // Create list of series with support of activation/deactivation
    $.each(keys, function(index, key) {
        var id = choiceContainer.attr('id') + index;
        $('<li />')
            .append($('<input id="' + id + '" name="' + key + '" type="checkbox" checked="checked" hidden />'))
            .append($('<label />', { 'text': key , 'for': id }))
            .appendTo(choiceContainer);
    });
    choiceContainer.find("label").click( function(){
        if (this.style.color !== "rgb(129, 129, 129)" ){
            this.style.color="#818181";
        }else {
            this.style.color="black";
        }
        $(this).parent().children().children().toggleClass("legend-disabled");
    });
    choiceContainer.find("label").mousedown( function(event){
        event.preventDefault();
    });
    choiceContainer.find("label").mouseenter(function(){
        this.style.cursor="pointer";
    });

    // Recreate graphe on series activation toggle
    choiceContainer.find("input").click(function(){
        infos.createGraph();
    });
}
