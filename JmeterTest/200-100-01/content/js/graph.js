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
        data: {"result": {"minY": 63.0, "minX": 0.0, "maxY": 21010.0, "series": [{"data": [[0.0, 63.0], [0.1, 95.0], [0.2, 164.0], [0.3, 240.0], [0.4, 309.0], [0.5, 339.0], [0.6, 351.0], [0.7, 372.0], [0.8, 391.0], [0.9, 401.0], [1.0, 414.0], [1.1, 428.0], [1.2, 443.0], [1.3, 450.0], [1.4, 462.0], [1.5, 472.0], [1.6, 482.0], [1.7, 487.0], [1.8, 495.0], [1.9, 502.0], [2.0, 509.0], [2.1, 513.0], [2.2, 517.0], [2.3, 521.0], [2.4, 525.0], [2.5, 528.0], [2.6, 532.0], [2.7, 535.0], [2.8, 543.0], [2.9, 549.0], [3.0, 555.0], [3.1, 560.0], [3.2, 563.0], [3.3, 566.0], [3.4, 569.0], [3.5, 572.0], [3.6, 576.0], [3.7, 579.0], [3.8, 582.0], [3.9, 585.0], [4.0, 589.0], [4.1, 592.0], [4.2, 596.0], [4.3, 598.0], [4.4, 601.0], [4.5, 604.0], [4.6, 607.0], [4.7, 609.0], [4.8, 613.0], [4.9, 617.0], [5.0, 622.0], [5.1, 627.0], [5.2, 629.0], [5.3, 632.0], [5.4, 634.0], [5.5, 637.0], [5.6, 642.0], [5.7, 645.0], [5.8, 647.0], [5.9, 652.0], [6.0, 656.0], [6.1, 658.0], [6.2, 662.0], [6.3, 665.0], [6.4, 667.0], [6.5, 668.0], [6.6, 670.0], [6.7, 673.0], [6.8, 674.0], [6.9, 676.0], [7.0, 679.0], [7.1, 681.0], [7.2, 683.0], [7.3, 685.0], [7.4, 687.0], [7.5, 689.0], [7.6, 690.0], [7.7, 691.0], [7.8, 694.0], [7.9, 695.0], [8.0, 697.0], [8.1, 698.0], [8.2, 700.0], [8.3, 702.0], [8.4, 704.0], [8.5, 706.0], [8.6, 707.0], [8.7, 710.0], [8.8, 712.0], [8.9, 715.0], [9.0, 717.0], [9.1, 721.0], [9.2, 723.0], [9.3, 725.0], [9.4, 727.0], [9.5, 729.0], [9.6, 732.0], [9.7, 734.0], [9.8, 737.0], [9.9, 739.0], [10.0, 741.0], [10.1, 743.0], [10.2, 745.0], [10.3, 748.0], [10.4, 750.0], [10.5, 752.0], [10.6, 753.0], [10.7, 756.0], [10.8, 757.0], [10.9, 759.0], [11.0, 760.0], [11.1, 762.0], [11.2, 763.0], [11.3, 766.0], [11.4, 767.0], [11.5, 769.0], [11.6, 771.0], [11.7, 773.0], [11.8, 776.0], [11.9, 779.0], [12.0, 781.0], [12.1, 783.0], [12.2, 785.0], [12.3, 787.0], [12.4, 789.0], [12.5, 792.0], [12.6, 794.0], [12.7, 797.0], [12.8, 800.0], [12.9, 802.0], [13.0, 805.0], [13.1, 808.0], [13.2, 810.0], [13.3, 813.0], [13.4, 815.0], [13.5, 818.0], [13.6, 820.0], [13.7, 823.0], [13.8, 825.0], [13.9, 827.0], [14.0, 830.0], [14.1, 832.0], [14.2, 834.0], [14.3, 835.0], [14.4, 837.0], [14.5, 838.0], [14.6, 841.0], [14.7, 843.0], [14.8, 845.0], [14.9, 847.0], [15.0, 849.0], [15.1, 850.0], [15.2, 852.0], [15.3, 853.0], [15.4, 855.0], [15.5, 858.0], [15.6, 859.0], [15.7, 861.0], [15.8, 863.0], [15.9, 865.0], [16.0, 866.0], [16.1, 868.0], [16.2, 870.0], [16.3, 872.0], [16.4, 874.0], [16.5, 876.0], [16.6, 879.0], [16.7, 880.0], [16.8, 883.0], [16.9, 885.0], [17.0, 887.0], [17.1, 890.0], [17.2, 892.0], [17.3, 893.0], [17.4, 895.0], [17.5, 896.0], [17.6, 898.0], [17.7, 900.0], [17.8, 902.0], [17.9, 905.0], [18.0, 907.0], [18.1, 909.0], [18.2, 910.0], [18.3, 913.0], [18.4, 915.0], [18.5, 918.0], [18.6, 920.0], [18.7, 921.0], [18.8, 922.0], [18.9, 924.0], [19.0, 926.0], [19.1, 928.0], [19.2, 930.0], [19.3, 931.0], [19.4, 933.0], [19.5, 935.0], [19.6, 937.0], [19.7, 939.0], [19.8, 940.0], [19.9, 941.0], [20.0, 943.0], [20.1, 945.0], [20.2, 946.0], [20.3, 948.0], [20.4, 949.0], [20.5, 950.0], [20.6, 951.0], [20.7, 952.0], [20.8, 954.0], [20.9, 955.0], [21.0, 957.0], [21.1, 958.0], [21.2, 959.0], [21.3, 960.0], [21.4, 961.0], [21.5, 962.0], [21.6, 963.0], [21.7, 964.0], [21.8, 965.0], [21.9, 967.0], [22.0, 968.0], [22.1, 969.0], [22.2, 970.0], [22.3, 971.0], [22.4, 973.0], [22.5, 974.0], [22.6, 975.0], [22.7, 976.0], [22.8, 977.0], [22.9, 978.0], [23.0, 980.0], [23.1, 980.0], [23.2, 981.0], [23.3, 982.0], [23.4, 983.0], [23.5, 985.0], [23.6, 986.0], [23.7, 988.0], [23.8, 990.0], [23.9, 991.0], [24.0, 993.0], [24.1, 995.0], [24.2, 996.0], [24.3, 997.0], [24.4, 998.0], [24.5, 999.0], [24.6, 1001.0], [24.7, 1002.0], [24.8, 1004.0], [24.9, 1005.0], [25.0, 1006.0], [25.1, 1008.0], [25.2, 1009.0], [25.3, 1010.0], [25.4, 1011.0], [25.5, 1013.0], [25.6, 1014.0], [25.7, 1016.0], [25.8, 1018.0], [25.9, 1020.0], [26.0, 1022.0], [26.1, 1024.0], [26.2, 1026.0], [26.3, 1028.0], [26.4, 1030.0], [26.5, 1031.0], [26.6, 1033.0], [26.7, 1035.0], [26.8, 1036.0], [26.9, 1038.0], [27.0, 1039.0], [27.1, 1041.0], [27.2, 1042.0], [27.3, 1044.0], [27.4, 1046.0], [27.5, 1047.0], [27.6, 1048.0], [27.7, 1050.0], [27.8, 1052.0], [27.9, 1054.0], [28.0, 1055.0], [28.1, 1057.0], [28.2, 1059.0], [28.3, 1060.0], [28.4, 1062.0], [28.5, 1064.0], [28.6, 1066.0], [28.7, 1067.0], [28.8, 1069.0], [28.9, 1070.0], [29.0, 1071.0], [29.1, 1073.0], [29.2, 1074.0], [29.3, 1076.0], [29.4, 1078.0], [29.5, 1079.0], [29.6, 1081.0], [29.7, 1082.0], [29.8, 1083.0], [29.9, 1086.0], [30.0, 1087.0], [30.1, 1088.0], [30.2, 1090.0], [30.3, 1091.0], [30.4, 1093.0], [30.5, 1095.0], [30.6, 1097.0], [30.7, 1099.0], [30.8, 1101.0], [30.9, 1102.0], [31.0, 1104.0], [31.1, 1106.0], [31.2, 1107.0], [31.3, 1109.0], [31.4, 1111.0], [31.5, 1113.0], [31.6, 1116.0], [31.7, 1119.0], [31.8, 1121.0], [31.9, 1122.0], [32.0, 1124.0], [32.1, 1126.0], [32.2, 1128.0], [32.3, 1130.0], [32.4, 1133.0], [32.5, 1135.0], [32.6, 1137.0], [32.7, 1139.0], [32.8, 1143.0], [32.9, 1144.0], [33.0, 1147.0], [33.1, 1149.0], [33.2, 1152.0], [33.3, 1154.0], [33.4, 1156.0], [33.5, 1157.0], [33.6, 1160.0], [33.7, 1162.0], [33.8, 1164.0], [33.9, 1166.0], [34.0, 1168.0], [34.1, 1171.0], [34.2, 1173.0], [34.3, 1174.0], [34.4, 1177.0], [34.5, 1178.0], [34.6, 1181.0], [34.7, 1183.0], [34.8, 1184.0], [34.9, 1186.0], [35.0, 1188.0], [35.1, 1190.0], [35.2, 1195.0], [35.3, 1199.0], [35.4, 1201.0], [35.5, 1205.0], [35.6, 1208.0], [35.7, 1211.0], [35.8, 1214.0], [35.9, 1219.0], [36.0, 1222.0], [36.1, 1226.0], [36.2, 1230.0], [36.3, 1238.0], [36.4, 1246.0], [36.5, 1253.0], [36.6, 1259.0], [36.7, 1264.0], [36.8, 1272.0], [36.9, 1279.0], [37.0, 1292.0], [37.1, 1297.0], [37.2, 1301.0], [37.3, 1307.0], [37.4, 1312.0], [37.5, 1319.0], [37.6, 1328.0], [37.7, 1335.0], [37.8, 1341.0], [37.9, 1347.0], [38.0, 1352.0], [38.1, 1357.0], [38.2, 1369.0], [38.3, 1375.0], [38.4, 1379.0], [38.5, 1388.0], [38.6, 1405.0], [38.7, 1415.0], [38.8, 1424.0], [38.9, 1436.0], [39.0, 1450.0], [39.1, 1458.0], [39.2, 1464.0], [39.3, 1470.0], [39.4, 1475.0], [39.5, 1496.0], [39.6, 1515.0], [39.7, 1528.0], [39.8, 1543.0], [39.9, 1561.0], [40.0, 1575.0], [40.1, 1586.0], [40.2, 1595.0], [40.3, 1617.0], [40.4, 1630.0], [40.5, 1661.0], [40.6, 1701.0], [40.7, 1721.0], [40.8, 1733.0], [40.9, 1755.0], [41.0, 1808.0], [41.1, 1825.0], [41.2, 1890.0], [41.3, 2000.0], [41.4, 2153.0], [41.5, 2337.0], [41.6, 2366.0], [41.7, 2390.0], [41.8, 2423.0], [41.9, 2464.0], [42.0, 2509.0], [42.1, 3072.0], [42.2, 3125.0], [42.3, 3155.0], [42.4, 3181.0], [42.5, 3198.0], [42.6, 3212.0], [42.7, 3223.0], [42.8, 3231.0], [42.9, 3243.0], [43.0, 3257.0], [43.1, 3268.0], [43.2, 3284.0], [43.3, 3295.0], [43.4, 3306.0], [43.5, 3315.0], [43.6, 3320.0], [43.7, 3331.0], [43.8, 3340.0], [43.9, 3351.0], [44.0, 3362.0], [44.1, 3368.0], [44.2, 3372.0], [44.3, 3378.0], [44.4, 3384.0], [44.5, 3389.0], [44.6, 3393.0], [44.7, 3398.0], [44.8, 3405.0], [44.9, 3408.0], [45.0, 3413.0], [45.1, 3420.0], [45.2, 3426.0], [45.3, 3432.0], [45.4, 3437.0], [45.5, 3440.0], [45.6, 3446.0], [45.7, 3450.0], [45.8, 3455.0], [45.9, 3458.0], [46.0, 3462.0], [46.1, 3466.0], [46.2, 3470.0], [46.3, 3474.0], [46.4, 3478.0], [46.5, 3481.0], [46.6, 3487.0], [46.7, 3492.0], [46.8, 3496.0], [46.9, 3503.0], [47.0, 3509.0], [47.1, 3513.0], [47.2, 3518.0], [47.3, 3522.0], [47.4, 3525.0], [47.5, 3529.0], [47.6, 3531.0], [47.7, 3536.0], [47.8, 3541.0], [47.9, 3543.0], [48.0, 3547.0], [48.1, 3551.0], [48.2, 3555.0], [48.3, 3558.0], [48.4, 3563.0], [48.5, 3566.0], [48.6, 3570.0], [48.7, 3573.0], [48.8, 3577.0], [48.9, 3582.0], [49.0, 3586.0], [49.1, 3591.0], [49.2, 3597.0], [49.3, 3599.0], [49.4, 3603.0], [49.5, 3606.0], [49.6, 3610.0], [49.7, 3613.0], [49.8, 3617.0], [49.9, 3621.0], [50.0, 3627.0], [50.1, 3632.0], [50.2, 3636.0], [50.3, 3639.0], [50.4, 3643.0], [50.5, 3646.0], [50.6, 3647.0], [50.7, 3650.0], [50.8, 3652.0], [50.9, 3655.0], [51.0, 3657.0], [51.1, 3660.0], [51.2, 3664.0], [51.3, 3667.0], [51.4, 3670.0], [51.5, 3673.0], [51.6, 3678.0], [51.7, 3681.0], [51.8, 3686.0], [51.9, 3689.0], [52.0, 3692.0], [52.1, 3696.0], [52.2, 3699.0], [52.3, 3702.0], [52.4, 3704.0], [52.5, 3706.0], [52.6, 3708.0], [52.7, 3712.0], [52.8, 3716.0], [52.9, 3718.0], [53.0, 3720.0], [53.1, 3722.0], [53.2, 3725.0], [53.3, 3727.0], [53.4, 3730.0], [53.5, 3732.0], [53.6, 3735.0], [53.7, 3736.0], [53.8, 3739.0], [53.9, 3741.0], [54.0, 3743.0], [54.1, 3747.0], [54.2, 3749.0], [54.3, 3752.0], [54.4, 3754.0], [54.5, 3756.0], [54.6, 3758.0], [54.7, 3759.0], [54.8, 3762.0], [54.9, 3765.0], [55.0, 3768.0], [55.1, 3770.0], [55.2, 3773.0], [55.3, 3776.0], [55.4, 3779.0], [55.5, 3782.0], [55.6, 3785.0], [55.7, 3789.0], [55.8, 3791.0], [55.9, 3793.0], [56.0, 3795.0], [56.1, 3797.0], [56.2, 3800.0], [56.3, 3801.0], [56.4, 3803.0], [56.5, 3805.0], [56.6, 3808.0], [56.7, 3810.0], [56.8, 3813.0], [56.9, 3815.0], [57.0, 3816.0], [57.1, 3819.0], [57.2, 3821.0], [57.3, 3825.0], [57.4, 3827.0], [57.5, 3829.0], [57.6, 3833.0], [57.7, 3835.0], [57.8, 3836.0], [57.9, 3839.0], [58.0, 3841.0], [58.1, 3843.0], [58.2, 3845.0], [58.3, 3847.0], [58.4, 3850.0], [58.5, 3851.0], [58.6, 3853.0], [58.7, 3856.0], [58.8, 3858.0], [58.9, 3861.0], [59.0, 3863.0], [59.1, 3865.0], [59.2, 3867.0], [59.3, 3869.0], [59.4, 3871.0], [59.5, 3873.0], [59.6, 3875.0], [59.7, 3876.0], [59.8, 3878.0], [59.9, 3880.0], [60.0, 3882.0], [60.1, 3884.0], [60.2, 3886.0], [60.3, 3887.0], [60.4, 3889.0], [60.5, 3890.0], [60.6, 3893.0], [60.7, 3894.0], [60.8, 3896.0], [60.9, 3897.0], [61.0, 3899.0], [61.1, 3900.0], [61.2, 3901.0], [61.3, 3903.0], [61.4, 3904.0], [61.5, 3905.0], [61.6, 3907.0], [61.7, 3908.0], [61.8, 3910.0], [61.9, 3912.0], [62.0, 3913.0], [62.1, 3915.0], [62.2, 3916.0], [62.3, 3917.0], [62.4, 3919.0], [62.5, 3920.0], [62.6, 3921.0], [62.7, 3923.0], [62.8, 3925.0], [62.9, 3927.0], [63.0, 3929.0], [63.1, 3930.0], [63.2, 3932.0], [63.3, 3933.0], [63.4, 3935.0], [63.5, 3937.0], [63.6, 3939.0], [63.7, 3940.0], [63.8, 3942.0], [63.9, 3944.0], [64.0, 3946.0], [64.1, 3947.0], [64.2, 3949.0], [64.3, 3950.0], [64.4, 3952.0], [64.5, 3954.0], [64.6, 3955.0], [64.7, 3957.0], [64.8, 3958.0], [64.9, 3960.0], [65.0, 3961.0], [65.1, 3963.0], [65.2, 3964.0], [65.3, 3965.0], [65.4, 3966.0], [65.5, 3968.0], [65.6, 3970.0], [65.7, 3973.0], [65.8, 3974.0], [65.9, 3975.0], [66.0, 3977.0], [66.1, 3978.0], [66.2, 3980.0], [66.3, 3982.0], [66.4, 3983.0], [66.5, 3985.0], [66.6, 3986.0], [66.7, 3988.0], [66.8, 3989.0], [66.9, 3991.0], [67.0, 3992.0], [67.1, 3994.0], [67.2, 3995.0], [67.3, 3997.0], [67.4, 3998.0], [67.5, 4000.0], [67.6, 4001.0], [67.7, 4002.0], [67.8, 4004.0], [67.9, 4005.0], [68.0, 4006.0], [68.1, 4007.0], [68.2, 4008.0], [68.3, 4010.0], [68.4, 4010.0], [68.5, 4012.0], [68.6, 4013.0], [68.7, 4014.0], [68.8, 4015.0], [68.9, 4017.0], [69.0, 4018.0], [69.1, 4020.0], [69.2, 4021.0], [69.3, 4022.0], [69.4, 4024.0], [69.5, 4025.0], [69.6, 4026.0], [69.7, 4028.0], [69.8, 4029.0], [69.9, 4031.0], [70.0, 4033.0], [70.1, 4035.0], [70.2, 4037.0], [70.3, 4038.0], [70.4, 4040.0], [70.5, 4042.0], [70.6, 4043.0], [70.7, 4045.0], [70.8, 4046.0], [70.9, 4047.0], [71.0, 4049.0], [71.1, 4052.0], [71.2, 4053.0], [71.3, 4055.0], [71.4, 4056.0], [71.5, 4058.0], [71.6, 4059.0], [71.7, 4061.0], [71.8, 4063.0], [71.9, 4065.0], [72.0, 4067.0], [72.1, 4068.0], [72.2, 4070.0], [72.3, 4071.0], [72.4, 4073.0], [72.5, 4074.0], [72.6, 4075.0], [72.7, 4077.0], [72.8, 4078.0], [72.9, 4080.0], [73.0, 4081.0], [73.1, 4082.0], [73.2, 4083.0], [73.3, 4084.0], [73.4, 4086.0], [73.5, 4087.0], [73.6, 4090.0], [73.7, 4091.0], [73.8, 4093.0], [73.9, 4094.0], [74.0, 4096.0], [74.1, 4098.0], [74.2, 4100.0], [74.3, 4102.0], [74.4, 4104.0], [74.5, 4106.0], [74.6, 4108.0], [74.7, 4111.0], [74.8, 4113.0], [74.9, 4115.0], [75.0, 4117.0], [75.1, 4119.0], [75.2, 4122.0], [75.3, 4124.0], [75.4, 4126.0], [75.5, 4127.0], [75.6, 4129.0], [75.7, 4131.0], [75.8, 4132.0], [75.9, 4135.0], [76.0, 4136.0], [76.1, 4138.0], [76.2, 4140.0], [76.3, 4143.0], [76.4, 4144.0], [76.5, 4146.0], [76.6, 4148.0], [76.7, 4150.0], [76.8, 4153.0], [76.9, 4154.0], [77.0, 4156.0], [77.1, 4158.0], [77.2, 4160.0], [77.3, 4161.0], [77.4, 4163.0], [77.5, 4166.0], [77.6, 4168.0], [77.7, 4170.0], [77.8, 4172.0], [77.9, 4175.0], [78.0, 4178.0], [78.1, 4180.0], [78.2, 4183.0], [78.3, 4185.0], [78.4, 4188.0], [78.5, 4191.0], [78.6, 4194.0], [78.7, 4196.0], [78.8, 4199.0], [78.9, 4201.0], [79.0, 4204.0], [79.1, 4206.0], [79.2, 4208.0], [79.3, 4210.0], [79.4, 4213.0], [79.5, 4214.0], [79.6, 4217.0], [79.7, 4219.0], [79.8, 4221.0], [79.9, 4223.0], [80.0, 4225.0], [80.1, 4227.0], [80.2, 4230.0], [80.3, 4232.0], [80.4, 4234.0], [80.5, 4236.0], [80.6, 4238.0], [80.7, 4240.0], [80.8, 4242.0], [80.9, 4244.0], [81.0, 4246.0], [81.1, 4248.0], [81.2, 4251.0], [81.3, 4254.0], [81.4, 4256.0], [81.5, 4258.0], [81.6, 4260.0], [81.7, 4263.0], [81.8, 4265.0], [81.9, 4267.0], [82.0, 4270.0], [82.1, 4273.0], [82.2, 4275.0], [82.3, 4279.0], [82.4, 4284.0], [82.5, 4288.0], [82.6, 4291.0], [82.7, 4294.0], [82.8, 4299.0], [82.9, 4302.0], [83.0, 4306.0], [83.1, 4312.0], [83.2, 4315.0], [83.3, 4320.0], [83.4, 4322.0], [83.5, 4326.0], [83.6, 4330.0], [83.7, 4340.0], [83.8, 4348.0], [83.9, 4357.0], [84.0, 4367.0], [84.1, 4379.0], [84.2, 4389.0], [84.3, 4404.0], [84.4, 4419.0], [84.5, 4450.0], [84.6, 4465.0], [84.7, 4478.0], [84.8, 4502.0], [84.9, 4514.0], [85.0, 4526.0], [85.1, 4567.0], [85.2, 5032.0], [85.3, 6216.0], [85.4, 6241.0], [85.5, 6415.0], [85.6, 6446.0], [85.7, 6643.0], [85.8, 9070.0], [85.9, 9077.0], [86.0, 9087.0], [86.1, 9096.0], [86.2, 9103.0], [86.3, 9108.0], [86.4, 9115.0], [86.5, 9118.0], [86.6, 9124.0], [86.7, 9128.0], [86.8, 9131.0], [86.9, 9135.0], [87.0, 9138.0], [87.1, 9140.0], [87.2, 9142.0], [87.3, 9145.0], [87.4, 9149.0], [87.5, 9152.0], [87.6, 9154.0], [87.7, 9156.0], [87.8, 9158.0], [87.9, 9160.0], [88.0, 9162.0], [88.1, 9164.0], [88.2, 9166.0], [88.3, 9167.0], [88.4, 9169.0], [88.5, 9171.0], [88.6, 9173.0], [88.7, 9174.0], [88.8, 9176.0], [88.9, 9177.0], [89.0, 9179.0], [89.1, 9181.0], [89.2, 9183.0], [89.3, 9185.0], [89.4, 9186.0], [89.5, 9188.0], [89.6, 9190.0], [89.7, 9192.0], [89.8, 9194.0], [89.9, 9196.0], [90.0, 9198.0], [90.1, 9201.0], [90.2, 9203.0], [90.3, 9204.0], [90.4, 9206.0], [90.5, 9207.0], [90.6, 9208.0], [90.7, 9211.0], [90.8, 9213.0], [90.9, 9215.0], [91.0, 9218.0], [91.1, 9220.0], [91.2, 9222.0], [91.3, 9224.0], [91.4, 9225.0], [91.5, 9227.0], [91.6, 9229.0], [91.7, 9232.0], [91.8, 9233.0], [91.9, 9235.0], [92.0, 9237.0], [92.1, 9239.0], [92.2, 9240.0], [92.3, 9242.0], [92.4, 9244.0], [92.5, 9246.0], [92.6, 9248.0], [92.7, 9252.0], [92.8, 9254.0], [92.9, 9256.0], [93.0, 9258.0], [93.1, 9260.0], [93.2, 9264.0], [93.3, 9266.0], [93.4, 9268.0], [93.5, 9270.0], [93.6, 9272.0], [93.7, 9274.0], [93.8, 9276.0], [93.9, 9279.0], [94.0, 9281.0], [94.1, 9284.0], [94.2, 9285.0], [94.3, 9289.0], [94.4, 9293.0], [94.5, 9297.0], [94.6, 9301.0], [94.7, 9304.0], [94.8, 9307.0], [94.9, 9311.0], [95.0, 9314.0], [95.1, 9319.0], [95.2, 9322.0], [95.3, 9324.0], [95.4, 9327.0], [95.5, 9329.0], [95.6, 9333.0], [95.7, 9337.0], [95.8, 9341.0], [95.9, 9344.0], [96.0, 9350.0], [96.1, 9355.0], [96.2, 9362.0], [96.3, 9372.0], [96.4, 9379.0], [96.5, 9385.0], [96.6, 9392.0], [96.7, 9398.0], [96.8, 9405.0], [96.9, 9410.0], [97.0, 9424.0], [97.1, 9437.0], [97.2, 9454.0], [97.3, 9480.0], [97.4, 9499.0], [97.5, 9514.0], [97.6, 9529.0], [97.7, 9562.0], [97.8, 9593.0], [97.9, 9618.0], [98.0, 9651.0], [98.1, 9674.0], [98.2, 9713.0], [98.3, 9724.0], [98.4, 9759.0], [98.5, 9811.0], [98.6, 9840.0], [98.7, 9894.0], [98.8, 9940.0], [98.9, 10001.0], [99.0, 10053.0], [99.1, 10093.0], [99.2, 10138.0], [99.3, 10158.0], [99.4, 10211.0], [99.5, 10241.0], [99.6, 10273.0], [99.7, 10567.0], [99.8, 21001.0], [99.9, 21002.0]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Response Time Percentiles"}},
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
        data: {"result": {"minY": 1.0, "minX": 0.0, "maxY": 1369.0, "series": [{"data": [[0.0, 22.0], [600.0, 760.0], [700.0, 925.0], [800.0, 973.0], [900.0, 1369.0], [1000.0, 1247.0], [1100.0, 920.0], [1200.0, 363.0], [1300.0, 284.0], [1400.0, 188.0], [1500.0, 142.0], [1600.0, 74.0], [1700.0, 72.0], [1800.0, 61.0], [1900.0, 7.0], [2000.0, 7.0], [2100.0, 20.0], [2200.0, 3.0], [2300.0, 58.0], [2400.0, 47.0], [2500.0, 14.0], [3000.0, 19.0], [3100.0, 74.0], [3200.0, 168.0], [3300.0, 276.0], [3400.0, 422.0], [3500.0, 494.0], [3600.0, 584.0], [3700.0, 790.0], [3800.0, 977.0], [3900.0, 1285.0], [4000.0, 1338.0], [4100.0, 931.0], [4200.0, 801.0], [4300.0, 286.0], [4400.0, 103.0], [4500.0, 73.0], [4600.0, 8.0], [4800.0, 2.0], [5000.0, 8.0], [5100.0, 2.0], [5200.0, 1.0], [5400.0, 1.0], [6300.0, 5.0], [6200.0, 33.0], [6400.0, 41.0], [6600.0, 11.0], [6900.0, 3.0], [6700.0, 2.0], [6800.0, 3.0], [9100.0, 777.0], [9200.0, 900.0], [9000.0, 83.0], [9400.0, 137.0], [9500.0, 80.0], [9300.0, 435.0], [9600.0, 74.0], [9700.0, 55.0], [10000.0, 45.0], [10100.0, 47.0], [9800.0, 51.0], [9900.0, 37.0], [10200.0, 54.0], [10300.0, 6.0], [10400.0, 5.0], [10500.0, 8.0], [21000.0, 53.0], [20900.0, 4.0], [100.0, 23.0], [200.0, 31.0], [300.0, 102.0], [400.0, 197.0], [500.0, 499.0]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 100, "maxX": 21000.0, "title": "Response Time Distribution"}},
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
        data: {"result": {"minY": 167.0, "minX": 0.0, "ticks": [[0, "Requests having \nresponse time <= 500ms"], [1, "Requests having \nresponse time > 500ms and <= 1,500ms"], [2, "Requests having \nresponse time > 1,500ms"], [3, "Requests in error"]], "maxY": 11932.0, "series": [{"data": [[1.0, 7523.0]], "isOverall": false, "label": "Requests having \nresponse time > 500ms and <= 1,500ms", "isController": false}, {"data": [[3.0, 167.0]], "isOverall": false, "label": "Requests in error", "isController": false}, {"data": [[0.0, 378.0]], "isOverall": false, "label": "Requests having \nresponse time <= 500ms", "isController": false}, {"data": [[2.0, 11932.0]], "isOverall": false, "label": "Requests having \nresponse time > 1,500ms", "isController": false}], "supportsControllersDiscrimination": false, "maxX": 3.0, "title": "Synthetic Response Times Distribution"}},
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
        data: {"result": {"minY": 80.28403361344533, "minX": 1.57477764E12, "maxY": 200.0, "series": [{"data": [[1.57477782E12, 200.0], [1.57477764E12, 200.0], [1.57477812E12, 200.0], [1.57477794E12, 200.0], [1.57477776E12, 200.0], [1.57477824E12, 80.28403361344533], [1.57477806E12, 200.0], [1.57477788E12, 200.0], [1.5747777E12, 200.0], [1.57477818E12, 186.50493583415582], [1.574778E12, 200.0]], "isOverall": false, "label": "01登录", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.57477824E12, "title": "Active Threads Over Time"}},
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
        data: {"result": {"minY": 64.0, "minX": 1.0, "maxY": 9320.2, "series": [{"data": [[2.0, 64.0], [3.0, 3064.0], [4.0, 1068.1666666666667], [5.0, 1273.0], [6.0, 2320.5], [7.0, 96.5], [8.0, 90.0], [9.0, 87.0], [10.0, 3082.0], [11.0, 3068.5], [12.0, 156.14285714285714], [13.0, 2077.4285714285716], [14.0, 3144.6666666666665], [15.0, 93.5], [16.0, 71.33333333333333], [17.0, 3136.3333333333335], [19.0, 3122.25], [20.0, 3110.5], [21.0, 210.33333333333334], [22.0, 203.0], [23.0, 175.66666666666666], [24.0, 1682.5], [25.0, 3226.6666666666665], [26.0, 3223.0], [27.0, 3215.0], [28.0, 3214.0], [29.0, 3211.25], [30.0, 3197.5], [31.0, 3178.0], [33.0, 349.0], [32.0, 1047.0], [35.0, 347.2], [37.0, 343.0], [36.0, 345.6666666666667], [39.0, 337.0], [38.0, 342.0], [40.0, 338.0], [43.0, 305.5], [42.0, 332.99999999999994], [45.0, 3131.3333333333335], [44.0, 1715.5], [47.0, 1612.3000000000002], [46.0, 3128.0], [49.0, 589.6666666666666], [48.0, 599.8333333333334], [51.0, 574.5], [53.0, 568.0], [55.0, 1035.5], [54.0, 560.0], [57.0, 3447.6666666666665], [56.0, 1997.5], [59.0, 2595.375], [58.0, 3390.0], [61.0, 492.0], [63.0, 482.6], [62.0, 486.0], [67.0, 320.0], [66.0, 3560.75], [65.0, 2979.2], [64.0, 1376.2857142857142], [71.0, 3285.5714285714284], [70.0, 3380.0], [69.0, 3429.0], [68.0, 3485.4285714285716], [74.0, 1198.111111111111], [73.0, 534.5], [72.0, 2326.0], [79.0, 3530.5], [78.0, 504.0], [77.0, 507.25], [76.0, 1526.6666666666667], [83.0, 711.0], [82.0, 717.6666666666666], [81.0, 3039.7499999999995], [80.0, 2006.5], [87.0, 702.0], [86.0, 705.5714285714287], [85.0, 707.0], [84.0, 710.0], [91.0, 3881.5], [90.0, 1747.6666666666665], [89.0, 1092.5], [88.0, 699.3333333333334], [95.0, 3803.0], [94.0, 1814.5000000000002], [93.0, 1704.0], [92.0, 3409.714285714286], [99.0, 3129.222222222222], [98.0, 425.0], [97.0, 2057.0], [96.0, 3101.3], [103.0, 9288.499999999998], [102.0, 9315.0], [101.0, 9320.2], [100.0, 8459.857142857143], [107.0, 686.0], [106.0, 690.6666666666666], [105.0, 697.75], [104.0, 9238.333333333334], [110.0, 675.3333333333334], [109.0, 676.4285714285714], [108.0, 682.0], [115.0, 600.5555555555557], [114.0, 657.8], [113.0, 669.6666666666667], [112.0, 669.75], [119.0, 3245.0], [118.0, 3265.0], [117.0, 3271.0], [116.0, 1509.9999999999998], [123.0, 9121.0], [122.0, 9136.57142857143], [121.0, 6185.0], [120.0, 3224.25], [127.0, 1969.2], [126.0, 2841.0], [125.0, 3930.8], [124.0, 3936.0], [135.0, 3732.0], [134.0, 3838.4999999999995], [133.0, 3868.6666666666665], [132.0, 3871.5], [131.0, 3200.571428571429], [130.0, 2284.5], [129.0, 2056.0], [128.0, 2292.25], [143.0, 3377.0], [142.0, 3385.25], [141.0, 1597.607142857143], [140.0, 526.4], [139.0, 527.0], [138.0, 530.2], [137.0, 536.0], [136.0, 2883.0], [151.0, 2625.0], [150.0, 2628.5], [149.0, 2125.6666666666665], [148.0, 3017.25], [147.0, 1630.6666666666667], [146.0, 1133.0], [145.0, 4689.833333333333], [144.0, 3729.9999999999995], [159.0, 7246.2941176470595], [158.0, 4574.380952380952], [157.0, 3541.0], [156.0, 3631.2799999999997], [155.0, 667.0625000000002], [154.0, 5124.859649122808], [153.0, 2259.866666666667], [152.0, 1813.235294117647], [167.0, 3719.25], [166.0, 3789.285714285714], [165.0, 2693.125], [164.0, 2643.764705882353], [163.0, 2105.3999999999996], [162.0, 1110.7999999999997], [161.0, 921.0], [160.0, 924.0], [175.0, 3989.6666666666665], [174.0, 4000.0], [173.0, 2364.0], [172.0, 1384.2], [171.0, 1829.111111111111], [170.0, 886.5714285714286], [169.0, 9127.5], [168.0, 5897.235294117648], [183.0, 2441.4843749999986], [182.0, 983.0909090909091], [181.0, 988.0], [180.0, 992.0], [179.0, 6232.755555555557], [178.0, 2736.5], [177.0, 3864.5], [176.0, 2394.307692307692], [191.0, 3154.20353982301], [190.0, 2610.1724137931037], [189.0, 1502.5], [188.0, 3851.0909090909095], [187.0, 726.0], [186.0, 750.8], [185.0, 7333.85], [184.0, 3739.25], [199.0, 3242.9870129870123], [198.0, 3828.8908450704225], [197.0, 3260.692307692308], [196.0, 4440.82222222222], [195.0, 3486.5], [194.0, 3273.9310344827595], [193.0, 2840.970873786407], [192.0, 1969.3333333333333], [200.0, 3533.9286725964566], [1.0, 1066.3333333333333]], "isOverall": false, "label": "HTTP请求", "isController": false}, {"data": [[195.07140000000064, 3490.7375500000044]], "isOverall": false, "label": "HTTP请求-Aggregated", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 200.0, "title": "Time VS Threads"}},
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
        data : {"result": {"minY": 1367.7, "minX": 1.57477764E12, "maxY": 28386.716666666667, "series": [{"data": [[1.57477782E12, 23491.233333333334], [1.57477764E12, 3627.983333333333], [1.57477812E12, 23448.866666666665], [1.57477794E12, 24377.533333333333], [1.57477776E12, 24518.9], [1.57477824E12, 6634.4], [1.57477806E12, 23722.183333333334], [1.57477788E12, 23359.083333333332], [1.5747777E12, 28386.716666666667], [1.57477818E12, 22577.45], [1.574778E12, 22623.016666666666]], "isOverall": false, "label": "Bytes received per second", "isController": false}, {"data": [[1.57477782E12, 8716.666666666666], [1.57477764E12, 1367.7], [1.57477812E12, 8525.633333333333], [1.57477794E12, 8633.5], [1.57477776E12, 9187.5], [1.57477824E12, 2489.0833333333335], [1.57477806E12, 8408.5], [1.57477788E12, 8433.333333333334], [1.5747777E12, 10259.916666666666], [1.57477818E12, 8475.433333333332], [1.574778E12, 8303.916666666666]], "isOverall": false, "label": "Bytes sent per second", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.57477824E12, "title": "Bytes Throughput Over Time"}},
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
        data: {"result": {"minY": 1598.9272727272723, "minX": 1.57477764E12, "maxY": 3920.632816408199, "series": [{"data": [[1.57477782E12, 3543.656816015254], [1.57477764E12, 1598.9272727272723], [1.57477812E12, 3808.5510204081615], [1.57477794E12, 3668.6245247148236], [1.57477776E12, 3429.4362811791298], [1.57477824E12, 2282.122689075628], [1.57477806E12, 3757.658846529811], [1.57477788E12, 3756.8358573522237], [1.5747777E12, 2838.5028089887687], [1.57477818E12, 3497.853899308986], [1.574778E12, 3920.632816408199]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.57477824E12, "title": "Response Time Over Time"}},
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
        data: {"result": {"minY": 1598.8969696969705, "minX": 1.57477764E12, "maxY": 3839.0515257628804, "series": [{"data": [[1.57477782E12, 3519.078169685421], [1.57477764E12, 1598.8969696969705], [1.57477812E12, 3710.5563654032962], [1.57477794E12, 3433.343631178711], [1.57477776E12, 3429.429478458043], [1.57477824E12, 2282.1176470588234], [1.57477806E12, 3562.171554252199], [1.57477788E12, 3656.0195407914075], [1.5747777E12, 2698.331861958272], [1.57477818E12, 3497.8519249753213], [1.574778E12, 3839.0515257628804]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.57477824E12, "title": "Latencies Over Time"}},
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
        data: {"result": {"minY": 101.40909090909093, "minX": 1.57477764E12, "maxY": 3092.830915457731, "series": [{"data": [[1.57477782E12, 2734.145853193514], [1.57477764E12, 101.40909090909093], [1.57477812E12, 3011.0500485908688], [1.57477794E12, 2882.3512357414493], [1.57477776E12, 2601.2825396825383], [1.57477824E12, 1830.8067226890757], [1.57477806E12, 2984.394916911043], [1.57477788E12, 2995.103077674648], [1.5747777E12, 1775.8386837881205], [1.57477818E12, 2762.5069101678178], [1.574778E12, 3092.830915457731]], "isOverall": false, "label": "HTTP请求", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.57477824E12, "title": "Connect Time Over Time"}},
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
        data: {"result": {"minY": 63.0, "minX": 1.57477764E12, "maxY": 10589.0, "series": [{"data": [[1.57477782E12, 9633.0], [1.57477764E12, 2407.0], [1.57477812E12, 10589.0], [1.57477794E12, 10147.0], [1.57477776E12, 9409.0], [1.57477824E12, 9341.0], [1.57477806E12, 10501.0], [1.57477788E12, 10241.0], [1.5747777E12, 9684.0], [1.57477818E12, 9351.0], [1.574778E12, 10410.0]], "isOverall": false, "label": "Max", "isController": false}, {"data": [[1.57477782E12, 267.0], [1.57477764E12, 109.0], [1.57477812E12, 322.0], [1.57477794E12, 218.0], [1.57477776E12, 384.0], [1.57477824E12, 63.0], [1.57477806E12, 209.0], [1.57477788E12, 217.0], [1.5747777E12, 260.0], [1.57477818E12, 253.0], [1.574778E12, 284.0]], "isOverall": false, "label": "Min", "isController": false}, {"data": [[1.57477782E12, 9092.0], [1.57477764E12, 2342.3], [1.57477812E12, 9205.0], [1.57477794E12, 9171.0], [1.57477776E12, 4497.100000000001], [1.57477824E12, 9194.0], [1.57477806E12, 9205.0], [1.57477788E12, 9165.0], [1.5747777E12, 4308.200000000001], [1.57477818E12, 9198.0], [1.574778E12, 9203.0]], "isOverall": false, "label": "90th percentile", "isController": false}, {"data": [[1.57477782E12, 9362.22], [1.57477764E12, 2398.46], [1.57477812E12, 9978.959999999992], [1.57477794E12, 9498.2], [1.57477776E12, 9292.0], [1.57477824E12, 9926.66], [1.57477806E12, 9944.0], [1.57477788E12, 9547.610000000002], [1.5747777E12, 9283.24], [1.57477818E12, 9929.61], [1.574778E12, 9937.0]], "isOverall": false, "label": "99th percentile", "isController": false}, {"data": [[1.57477782E12, 9225.0], [1.57477764E12, 2372.65], [1.57477812E12, 9325.0], [1.57477794E12, 9267.0], [1.57477776E12, 9218.0], [1.57477824E12, 9306.0], [1.57477806E12, 9328.0], [1.57477788E12, 9251.35], [1.5747777E12, 9172.0], [1.57477818E12, 9310.0], [1.574778E12, 9317.0]], "isOverall": false, "label": "95th percentile", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.57477824E12, "title": "Response Time Percentiles Over Time (successful requests only)"}},
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
    data: {"result": {"minY": 703.0, "minX": 5.0, "maxY": 6956.0, "series": [{"data": [[33.0, 3722.0], [34.0, 3748.0], [35.0, 3681.0], [36.0, 3727.0], [9.0, 703.0], [5.0, 1669.5], [41.0, 1586.0]], "isOverall": false, "label": "Successes", "isController": false}, {"data": [[33.0, 6826.5], [34.0, 6440.0], [35.0, 6720.0], [5.0, 882.0], [41.0, 6956.0]], "isOverall": false, "label": "Failures", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 41.0, "title": "Response Time Vs Request"}},
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
    data: {"result": {"minY": 0.0, "minX": 5.0, "maxY": 3748.0, "series": [{"data": [[33.0, 3722.0], [34.0, 3748.0], [35.0, 3681.0], [36.0, 3727.0], [9.0, 703.0], [5.0, 1669.5], [41.0, 1586.0]], "isOverall": false, "label": "Successes", "isController": false}, {"data": [[33.0, 0.0], [34.0, 0.0], [35.0, 0.0], [5.0, 881.5], [41.0, 0.0]], "isOverall": false, "label": "Failures", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 41.0, "title": "Latencies Vs Request"}},
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
        data: {"result": {"minY": 6.666666666666667, "minX": 1.57477764E12, "maxY": 41.75, "series": [{"data": [[1.57477782E12, 36.46666666666667], [1.57477764E12, 6.666666666666667], [1.57477812E12, 34.03333333333333], [1.57477794E12, 35.5], [1.57477776E12, 36.93333333333333], [1.57477824E12, 7.7], [1.57477806E12, 32.75], [1.57477788E12, 32.666666666666664], [1.5747777E12, 41.75], [1.57477818E12, 34.266666666666666], [1.574778E12, 34.6]], "isOverall": false, "label": "hitsPerSecond", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.57477824E12, "title": "Hits Per Second"}},
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
        data: {"result": {"minY": 0.016666666666666666, "minX": 1.57477764E12, "maxY": 41.083333333333336, "series": [{"data": [[1.57477782E12, 34.86666666666667], [1.57477764E12, 5.433333333333334], [1.57477812E12, 33.96666666666667], [1.57477794E12, 34.45], [1.57477776E12, 36.75], [1.57477824E12, 9.916666666666666], [1.57477806E12, 33.5], [1.57477788E12, 33.733333333333334], [1.5747777E12, 41.083333333333336], [1.57477818E12, 33.766666666666666], [1.574778E12, 33.083333333333336]], "isOverall": false, "label": "200", "isController": false}, {"data": [[1.57477782E12, 0.016666666666666666], [1.57477812E12, 0.08333333333333333], [1.57477794E12, 0.3], [1.57477806E12, 0.2], [1.57477788E12, 0.06666666666666667], [1.5747777E12, 0.2], [1.574778E12, 0.08333333333333333]], "isOverall": false, "label": "Non HTTP response code: java.net.ConnectException", "isController": false}, {"data": [[1.57477764E12, 0.06666666666666667]], "isOverall": false, "label": "500", "isController": false}, {"data": [[1.57477782E12, 0.08333333333333333], [1.57477812E12, 0.25], [1.57477794E12, 0.31666666666666665], [1.57477806E12, 0.4], [1.57477788E12, 0.31666666666666665], [1.5747777E12, 0.25], [1.574778E12, 0.15]], "isOverall": false, "label": "Non HTTP response code: org.apache.http.NoHttpResponseException", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.57477824E12, "title": "Codes Per Second"}},
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
        data: {"result": {"minY": 0.06666666666666667, "minX": 1.57477764E12, "maxY": 41.083333333333336, "series": [{"data": [[1.57477782E12, 0.1], [1.57477764E12, 0.06666666666666667], [1.57477812E12, 0.3333333333333333], [1.57477794E12, 0.6166666666666667], [1.57477806E12, 0.6], [1.57477788E12, 0.38333333333333336], [1.5747777E12, 0.45], [1.574778E12, 0.23333333333333334]], "isOverall": false, "label": "HTTP请求-failure", "isController": false}, {"data": [[1.57477782E12, 34.86666666666667], [1.57477764E12, 5.433333333333334], [1.57477812E12, 33.96666666666667], [1.57477794E12, 34.45], [1.57477776E12, 36.75], [1.57477824E12, 9.916666666666666], [1.57477806E12, 33.5], [1.57477788E12, 33.733333333333334], [1.5747777E12, 41.083333333333336], [1.57477818E12, 33.766666666666666], [1.574778E12, 33.083333333333336]], "isOverall": false, "label": "HTTP请求-success", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.57477824E12, "title": "Transactions Per Second"}},
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
