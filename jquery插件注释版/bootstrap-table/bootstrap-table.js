/**
 * @author zhixin wen <wenzhixin2010@gmail.com>
 * version: 1.11.1
 * https://github.com/wenzhixin/bootstrap-table/
 */

(function ($) {
    'use strict';

    // TOOLS DEFINITION
    // ======================

    var cachedWidth = null;

    // it only does '%s', and return '' when arguments are undefined
    var sprintf = function (str) {
        var args = arguments,
            flag = true,
            i = 1;

        str = str.replace(/%s/g, function () {
            var arg = args[i++];

            if (typeof arg === 'undefined') {
                flag = false;
                return '';
            }
            return arg;
        });
        return flag ? str : '';
    };

    var getPropertyFromOther = function (list, from, to, value) {
        var result = '';
        $.each(list, function (i, item) {
            if (item[from] === value) {
                result = item[to];
                return false; //返回值为false，则停止循环(相当于普通循环中的break)
            }
            return true;
        });
        return result;
    };

    // http://jsfiddle.net/wenyi/47nz7ez9/3/
    var setFieldIndex = function (columns) {
        var i, j, k,
            totalCol = 0,
            flag = [];

        for (i = 0; i < columns[0].length; i++) {
            totalCol += columns[0][i].colspan || 1;
        }

        for (i = 0; i < columns.length; i++) {
            flag[i] = [];
            for (j = 0; j < totalCol; j++) {
                flag[i][j] = false;
            }
        }

        for (i = 0; i < columns.length; i++) {
            for (j = 0; j < columns[i].length; j++) {
                var r = columns[i][j],
                    rowspan = r.rowspan || 1,
                    colspan = r.colspan || 1,
                    index = $.inArray(false, flag[i]);

                if (colspan === 1) {
                    r.fieldIndex = index;
                    // when field is undefined, use index instead
                    if (typeof r.field === 'undefined') {
                        r.field = index;
                    }
                }

                for (k = 0; k < rowspan; k++) {
                    flag[i + k][index] = true;
                }
                for (k = 0; k < colspan; k++) {
                    flag[i][index + k] = true;
                }
            }
        }
    };
    // 获取滚动条的宽度;
    var getScrollBarWidth = function () {
        if (cachedWidth === null) {
            var inner = $('<p/>').addClass('fixed-table-scroll-inner'),
                outer = $('<div/>').addClass('fixed-table-scroll-outer'),
                w1, w2;

            outer.append(inner);
            $('body').append(outer);

            w1 = inner[0].offsetWidth;
            outer.css('overflow', 'scroll');
            w2 = inner[0].offsetWidth;

            if (w1 === w2) {
                w2 = outer[0].clientWidth;
            }

            outer.remove();
            cachedWidth = w1 - w2;
        }
        return cachedWidth;
    };

    /*
     *     当name为字符串时，获取window对象的方法并执行，参数为args，没有该方法时调用sprintf替换name文本; 
     *     当name为函数时，传入args执行该函数; 
     *     以上情况都不是返回defaultValue; 
     *     问题：原型中的方法可以直接调用，window对象的方法使用户配置变得繁琐，sprintfy也可以预先作判断后调用; 
     */
    var calculateObjectValue = function (self, name, args, defaultValue) {
        var func = name;

        if (typeof name === 'string') {
            // support obj.func1.func2
            var names = name.split('.'); //切分字符串变成数组

            if (names.length > 1) {
                func = window;
                $.each(names, function (i, f) {
                    func = func[f];
                });
            } else {
                func = window[name];
            }
        }
        if (typeof func === 'object') {
            return func;
        }
        //主要用来name属性是一个sort方法的情况
        if (typeof func === 'function') {
            return func.apply(self, args || []);
        }
        if (!func && typeof name === 'string' && sprintf.apply(this, [name].concat(args))) {
            return sprintf.apply(this, [name].concat(args));
        }
        return defaultValue;
    };

    var compareObjects = function (objectA, objectB, compareLength) {
        // Create arrays of property names
        var objectAProperties = Object.getOwnPropertyNames(objectA), //Object.getOwnPropertyNames获取对象的所有自身属性的属性名（包括不可枚举属性但不包括Symbol值作为名称的属性）组成的数组
            objectBProperties = Object.getOwnPropertyNames(objectB),
            propName = '';

        if (compareLength) {
            // If number of properties is different, objects are not equivalent
            if (objectAProperties.length !== objectBProperties.length) {
                return false;
            }
        }

        for (var i = 0; i < objectAProperties.length; i++) {
            propName = objectAProperties[i];

            // If the property is not in the object B properties, continue with the next property
            if ($.inArray(propName, objectBProperties) > -1) {
                // If values of same property are not equal, objects are not equivalent
                if (objectA[propName] !== objectB[propName]) {
                    return false;
                }
            }
        }

        // If we made it this far, objects are considered equivalent
        return true;
    };

    //对字符串中一些特殊符号进行转义
    var escapeHTML = function (text) {
        if (typeof text === 'string') {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/`/g, '&#x60;');
        }
        return text;
    };

    //将paramName的data属性转换成param-name修改完成后输出
    var getRealDataAttr = function (dataAttr) {
        for (var attr in dataAttr) {
            var auxAttr = attr.split(/(?=[A-Z])/).join('-').toLowerCase();
            if (auxAttr !== attr) {
                dataAttr[auxAttr] = dataAttr[attr];
                delete dataAttr[attr];
            }
        }

        return dataAttr;
    };

    /*
        当field为函数时，获取item[field]并进行转义(escape为真的情况下); 
        当field为字符串时，以最末一个点号后的字符获取item中的属性并进行转义(escape为真的情况下); 
        问题：实际应用场景field多是字符串，且没有点号，可以限制用户配置使调用函数变得方便; 
    */
    var getItemField = function (item, field, escape) {
        var value = item;

        if (typeof field !== 'string' || item.hasOwnProperty(field)) {
            return escape ? escapeHTML(item[field]) : item[field];
        }
        var props = field.split('.');
        for (var p in props) {
            if (props.hasOwnProperty(p)) {
                value = value && value[props[p]];
            }
        }
        return escape ? escapeHTML(value) : value;
    };

    var isIEBrowser = function () {
        return !!(navigator.userAgent.indexOf("MSIE ") > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./));
    };

    var objectKeys = function () {
        // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
        if (!Object.keys) {
            Object.keys = (function() {
                var hasOwnProperty = Object.prototype.hasOwnProperty,
                    hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
                    dontEnums = [
                        'toString',
                        'toLocaleString',
                        'valueOf',
                        'hasOwnProperty',
                        'isPrototypeOf',
                        'propertyIsEnumerable',
                        'constructor'
                    ],
                    dontEnumsLength = dontEnums.length;

                return function(obj) {
                    if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
                        throw new TypeError('Object.keys called on non-object');
                    }

                    var result = [], prop, i;

                    for (prop in obj) {
                        if (hasOwnProperty.call(obj, prop)) {
                            result.push(prop);
                        }
                    }

                    if (hasDontEnumBug) {
                        for (i = 0; i < dontEnumsLength; i++) {
                            if (hasOwnProperty.call(obj, dontEnums[i])) {
                                result.push(dontEnums[i]);
                            }
                        }
                    }
                    return result;
                };
            }());
        }
    };

    // BOOTSTRAP TABLE CLASS DEFINITION
    // ======================

    var BootstrapTable = function (el, options) {
        this.options = options;
        this.$el = $(el);
        this.$el_ = this.$el.clone();
        this.timeoutId_ = 0;
        this.timeoutFooter_ = 0;

        this.init();
    };

    BootstrapTable.DEFAULTS = {
        classes: 'table table-hover', //触发样式table加入的样式
        sortClass: undefined,
        locale: undefined, //设置语言包
        height: undefined, //包括分页和工具栏的高度
        undefinedText: '-', //无显示文本时默认显示内容
        sortName: undefined, 
        // 初始化排序字段名，须是column.filed主键名;  
        // 点击排序后更新options.sortName为被排序列的主键名columns[i].field;  
        // 通过主键名在this.header.fields中的序号获取sortName，比较后排序;
        sortOrder: 'asc',
        sortStable: false,
        rememberOrder: false,
        striped: false, //触发元素table是否隔行变色
        columns: [[]], 
        data: [],
        totalField: 'total',
        dataField: 'rows', //后台传回data数据的字段名
        method: 'get', //ajax发送类型
        url: undefined, //ajax发送地址
        ajax: undefined, 
        cache: true, //ajax设置
        contentType: 'application/json', //设置ajax请求头content-type属性的值
        dataType: 'json', //ajax返回数据的格式
        ajaxOptions: {},
        queryParams: function (params) {
            return params;
        },
        queryParamsType: 'limit', // undefined
        responseHandler: function (res) {
            return res;
        }, //ajax处理相应的函数
        pagination: false, //分页是否显示
        onlyInfoPagination: false, //分页文案提示只显示有多少条数据
        paginationLoop: true,
        sidePagination: 'client', // client or server 前台分页或者后台分页
        totalRows: 0, // server side need to set
        pageNumber: 1, //初始化显示第几页
        pageSize: 10, //初始化每页显示多少条数据
        pageList: [10, 25, 50, 100], //每页显示数据量切换配置项
        paginationHAlign: 'right', //right, left 分页浮动设置
        paginationVAlign: 'bottom', //bottom, top, both
        // 分页显示位置，上、下或上下均显示，默认底部显示  
        // 设置一页显示多少条数据按钮向上下拉，还是向下下拉，默认向上下拉  
        // 设置为both时，分页在上下位置均显示，设置一页显示多少条数据按钮向上下拉 
        paginationDetailHAlign: 'left', //right, left //每页几行数据显示区浮动情况
        paginationPreText: '&lsaquo;', //分页上一页按钮
        paginationNextText: '&rsaquo;', //分页下一页按钮
        search: false, //是否支持搜索
        searchOnEnterKey: false, //enter键开启搜索
        strictSearch: false, //严格搜索还是模糊搜索
        searchAlign: 'right', //搜索框水平对齐方式
        selectItemName: 'btSelectItem', //复选框默认上传name值 
        showHeader: true, //显示表头，包含标题栏内容
        showFooter: false, //默认隐藏表尾
        showColumns: false, //显示筛选条目按钮
        showPaginationSwitch: false, //显示分页隐藏展示按钮
        showRefresh: false, //显示刷新按钮
        showToggle: false, //显示切换表格显示或卡片式详情显示按钮 
        buttonsAlign: 'right', //显示隐藏分页、刷新、切换表格或卡片显示模式、筛选显示条目、下载按钮浮动设置  
        smartDisplay: true, //smartDisplay为真，当总页数为1时，屏蔽分页，以及下拉列表仅有一条时，屏蔽切换条目数按钮下拉功能  
        escape: false, //是否转义
        minimumCountColumns: 1, //最小显示条目数
        idField: undefined, //data中存储复选框value的键值
        uniqueId: undefined, //从data中获取每行数据唯一标识的属性名
        cardView: false, //是否显示卡片式详情（移动端），直接罗列每行信息，不以表格形式显现
        detailView: false, //表格显示数据时，每行数据前是否有点击按钮，显示这行数据的卡片式详情
        detailFormatter: function (index, row) {
            return '';
        }, //折叠式卡片详情渲染文本，包含html标签、Dom元素
        detailFilter: function (index, row) {
            return true;
        },
        trimOnSearch: true, //搜索框键入值执行搜索时，清除两端空格填入该搜索框
        clickToSelect: false, 
        singleSelect: false, //复选框只能单选，需设置column.radio属性为真  
        toolbar: undefined, //用户自定义按钮组，区别于搜索框、分页切换按钮等
        toolbarAlign: 'left', //用户自定义按钮组浮动情况 
        checkboxHeader: true, //是否隐藏全选按钮 
        sortable: true, //可排序全局设置
        silentSort: true, //ajax交互的时候是否显示loadding加载信息 
        maintainSelected: false, //为真且翻页时，保持前一页各条row[that.header.stateField]为翻页前的值 
        searchTimeOut: 500, //搜索框键入值敲enter后隔多少时间执行搜索，使用clearTimeout避免间隔时间内多次键入反复搜索
        searchText: '', //初始化搜索内容
        iconSize: undefined, //按钮、搜索输入框通用大小，使用bootstrap的sm、md、lg等
        buttonsClass: 'default',
        iconsPrefix: 'glyphicon', // glyphicon of fa (font awesome)
        icons: {
            paginationSwitchDown: 'glyphicon-collapse-down icon-chevron-down',
            paginationSwitchUp: 'glyphicon-collapse-up icon-chevron-up',
            refresh: 'glyphicon-refresh icon-refresh',
            toggle: 'glyphicon-list-alt icon-list-alt',
            columns: 'glyphicon-th icon-th',
            detailOpen: 'glyphicon-plus icon-plus',
            detailClose: 'glyphicon-minus icon-minus'
        },

        customSearch: $.noop,

        customSort: $.noop,

        rowStyle: function (row, index) {
            return {};
        },

        rowAttributes: function (row, index) {
            return {};
        },

        footerStyle: function (row, index) {
            return {};
        },

        onAll: function (name, args) {
            return false;
        },
        onClickCell: function (field, value, row, $element) {
            return false;
        },
        onDblClickCell: function (field, value, row, $element) {
            return false;
        },
        onClickRow: function (item, $element) {
            return false;
        },
        onDblClickRow: function (item, $element) {
            return false;
        },
        onSort: function (name, order) {
            return false;
        },
        onCheck: function (row) {
            return false;
        },
        onUncheck: function (row) {
            return false;
        },
        onCheckAll: function (rows) {
            return false;
        },
        onUncheckAll: function (rows) {
            return false;
        },
        onCheckSome: function (rows) {
            return false;
        },
        onUncheckSome: function (rows) {
            return false;
        },
        onLoadSuccess: function (data) {
            return false;
        },
        onLoadError: function (status) {
            return false;
        },
        onColumnSwitch: function (field, checked) {
            return false;
        },
        onPageChange: function (number, size) {
            return false;
        },
        onSearch: function (text) {
            return false;
        },
        onToggle: function (cardView) {
            return false;
        },
        onPreBody: function (data) {
            return false;
        },
        onPostBody: function () {
            return false;
        },
        onPostHeader: function () {
            return false;
        },
        onExpandRow: function (index, row, $detail) {
            return false;
        },
        onCollapseRow: function (index, row) {
            return false;
        },
        onRefreshOptions: function (options) {
            return false;
        },
        onRefresh: function (params) {
          return false;
        },
        onResetView: function () {
            return false;
        },

        //自定义默认单元格返回内容
        tdFormatter: function (value) {
            if(value == null){
                return ""
            }else{
                return '<span class="tdCnt" style="display:inline-block;">' + value + '</span>'
            }
        }
    };

    BootstrapTable.LOCALES = {};

    BootstrapTable.LOCALES['en-US'] = BootstrapTable.LOCALES.en = {
        formatLoadingMessage: function () {
            return 'Loading, please wait...';
        },
        formatRecordsPerPage: function (pageNumber) {
            return sprintf('%s rows per page', pageNumber);
        },
        formatShowingRows: function (pageFrom, pageTo, totalRows) {
            return sprintf('Showing %s to %s of %s rows', pageFrom, pageTo, totalRows);
        },
        formatDetailPagination: function (totalRows) {
            return sprintf('Showing %s rows', totalRows);
        },
        formatSearch: function () {
            return 'Search';
        },
        formatNoMatches: function () {
            return 'No matching records found';
        },
        formatPaginationSwitch: function () {
            return 'Hide/Show pagination';
        },
        formatRefresh: function () {
            return 'Refresh';
        },
        formatToggle: function () {
            return 'Toggle';
        },
        formatColumns: function () {
            return 'Columns';
        },
        formatAllRows: function () {
            return 'All';
        }
    };

    $.extend(BootstrapTable.DEFAULTS, BootstrapTable.LOCALES['en-US']);

    BootstrapTable.COLUMN_DEFAULTS = {
        radio: false, //有否radio，有则options.singleSelect设为真
        checkbox: false, //有否checkbox，options.singleSelect设为真，checkbox单选
        checkboxEnabled: true, //复选框是否可选
        field: undefined, //后台数据的id号
        title: undefined, //内容文案
        titleTooltip: undefined, //title属性文案
        'class': undefined, //样式
        align: undefined, // left, right, center -- tbody、thead、tfoot文本对齐情况 
        halign: undefined, // left, right, center -- thead文本对齐情况
        falign: undefined, // left, right, center -- tfoot文本对齐情况 
        valign: undefined, // top, middle, bottom -- 垂直对齐情况
        width: undefined, //宽度，字符串或数值输入，均转化为"36px"或"10%"形式
        sortable: false, //是否可排序，options.sortable设置为真的时候可用
        order: 'asc', // asc, desc
        visible: true, //可见性
        switchable: true, //该条目可以通过筛选条目按钮切换显示状态
        clickToSelect: true, 
        formatter: undefined, //以function(field,row,index){}格式化数据，field后台字段，row行数据，index对应row的序号值  无配置时以title显示，有配置时以返回值显示
        footerFormatter: undefined, //填充表尾内容
        events: undefined, //数据格式为[{"click element":functionName}],回调中传入（value,row,index）
        sorter: undefined, //调用sorter函数或window[sorter]函数进行排序，高优先级
        sortName: undefined, //进行排序的字段名，用以获取options.data中的数据
        cellStyle: undefined,
        // 调用cellStyle函数或window[cellStyle]函数添加样式以及类;  
        // 以function(field,row,index){}设置单元格样式以及样式类，返回数据格式为{classes:"class1 class2",css:{key:value}}
        searchable: true, //设置哪一列的数据元素可搜索
        searchFormatter: true,
        cardVisible: true, //设为否时，卡片式显示时该列数据不显
        escape : false
    };

    BootstrapTable.EVENTS = {
        'all.bs.table': 'onAll',
        'click-cell.bs.table': 'onClickCell',
        'dbl-click-cell.bs.table': 'onDblClickCell',
        'click-row.bs.table': 'onClickRow',
        'dbl-click-row.bs.table': 'onDblClickRow',
        'sort.bs.table': 'onSort',
        'check.bs.table': 'onCheck',
        'uncheck.bs.table': 'onUncheck',
        'check-all.bs.table': 'onCheckAll',
        'uncheck-all.bs.table': 'onUncheckAll',
        'check-some.bs.table': 'onCheckSome',
        'uncheck-some.bs.table': 'onUncheckSome',
        'load-success.bs.table': 'onLoadSuccess',
        'load-error.bs.table': 'onLoadError',
        'column-switch.bs.table': 'onColumnSwitch',
        'page-change.bs.table': 'onPageChange',
        'search.bs.table': 'onSearch',
        'toggle.bs.table': 'onToggle',
        'pre-body.bs.table': 'onPreBody',
        'post-body.bs.table': 'onPostBody',
        'post-header.bs.table': 'onPostHeader',
        'expand-row.bs.table': 'onExpandRow',
        'collapse-row.bs.table': 'onCollapseRow',
        'refresh-options.bs.table': 'onRefreshOptions',
        'reset-view.bs.table': 'onResetView',
        'refresh.bs.table': 'onRefresh'
    };

    BootstrapTable.prototype.init = function () {
        //添加语言包
        this.initLocale();

        //创建包裹元素this.container及其子元素this.$toolbar、this.$pagination等，为表格添加样式
        this.initContainer();

        //获取页面配置更新options.columns、options.data，this.columns记录表体对应标题栏的数据;
        this.initTable();

        // 渲染表头，设置this.header数据记录主键等，绑定表头事件，卡片式显示时隐藏表头;
        this.initHeader();

        // 页面初始化、后台传值、表头表尾插入数据，更新this.data、options.data，前台分页则排序;
        this.initData();


        this.initHiddenRows();

        //显示隐藏表尾
        this.initFooter();

        //创建工具栏按钮组，并绑定事件;
        this.initToolbar();

        // 创建分页相关内容，并绑定事件; 
        this.initPagination();

        // 渲染表体，区分卡片显示和表格显示两类，绑定相关事件; 
        this.initBody();

        // 初始化若设置搜索文本，开启搜索，不支持本地数据搜索;
        this.initSearchText();

        // 上传数据，成功时调用load方法渲染表格; 
        this.initServer();
    };

    BootstrapTable.prototype.initLocale = function () {
        if (this.options.locale) {
            var parts = this.options.locale.split(/-|_/);
            parts[0].toLowerCase();
            if (parts[1]) parts[1].toUpperCase();
            if ($.fn.bootstrapTable.locales[this.options.locale]) {
                // locale as requested
                $.extend(this.options, $.fn.bootstrapTable.locales[this.options.locale]);
            } else if ($.fn.bootstrapTable.locales[parts.join('-')]) {
                // locale with sep set to - (in case original was specified with _)
                $.extend(this.options, $.fn.bootstrapTable.locales[parts.join('-')]);
            } else if ($.fn.bootstrapTable.locales[parts[0]]) {
                // short locale language code (i.e. 'en')
                $.extend(this.options, $.fn.bootstrapTable.locales[parts[0]]);
            }
        }
    };

    BootstrapTable.prototype.initContainer = function () {
        this.$container = $([
            '<div class="bootstrap-table">',
            '<div class="fixed-table-toolbar"></div>',
            this.options.paginationVAlign === 'top' || this.options.paginationVAlign === 'both' ?
                '<div class="fixed-table-pagination" style="clear: both;"></div>' :
                '',
            '<div class="fixed-table-container">',
            '<div class="fixed-table-header"><table></table></div>',
            '<div class="fixed-table-body">',
            '<div class="fixed-table-loading">',
            this.options.formatLoadingMessage(),
            '</div>',
            '</div>',
            '<div class="fixed-table-footer"><table><tr></tr></table></div>',
            this.options.paginationVAlign === 'bottom' || this.options.paginationVAlign === 'both' ?
                '<div class="fixed-table-pagination"></div>' :
                '',
            '</div>',
            '</div>'
        ].join(''));


        this.$container.insertAfter(this.$el);
        this.$tableContainer = this.$container.find('.fixed-table-container');
        this.$tableHeader = this.$container.find('.fixed-table-header');
        this.$tableBody = this.$container.find('.fixed-table-body');
        this.$tableLoading = this.$container.find('.fixed-table-loading');
        this.$tableFooter = this.$container.find('.fixed-table-footer');
        this.$toolbar = this.$container.find('.fixed-table-toolbar');
        this.$pagination = this.$container.find('.fixed-table-pagination');

        this.$tableBody.append(this.$el); //this.$el会被从原来位置移除然后添加到this.$tableBody里面
        this.$container.after('<div class="clearfix"></div>');

        this.$el.addClass(this.options.classes);
        if (this.options.striped) {
            this.$el.addClass('table-striped');
        }
        if ($.inArray('table-no-bordered', this.options.classes.split(' ')) !== -1) {
            this.$tableContainer.addClass('table-no-bordered');
        }
    };


    // 当html中包含thead>tr>th以及tbody>tr>td时，获取页面的配置项更新options.columns、options.data;  
    // js配置的优先级高于html页面配置;  
    // this.columns以this.columns[fieldIndex]的数组形式[columns]记录表体相应标题栏的数据内容; 
    BootstrapTable.prototype.initTable = function () {
        var that = this,
            columns = [],
            data = [];

        this.$header = this.$el.find('>thead');
        if (!this.$header.length) {
            this.$header = $('<thead></thead>').appendTo(this.$el);
        }
        this.$header.find('tr').each(function () { //在html结构里面写了表格结构的情况
            var column = [];

            $(this).find('th').each(function () {
                // Fix #2014 - getFieldIndex and elsewhere assume this is string, causes issues if not
                if (typeof $(this).data('field') !== 'undefined') {
                    $(this).data('field', $(this).data('field') + '');
                }
                column.push($.extend({}, {
                    title: $(this).html(),
                    'class': $(this).attr('class'),
                    titleTooltip: $(this).attr('title'),
                    rowspan: $(this).attr('rowspan') ? +$(this).attr('rowspan') : undefined,
                    colspan: $(this).attr('colspan') ? +$(this).attr('colspan') : undefined
                }, $(this).data())); //data方法不传入参数，该方法将以对象的形式从元素中返回所有存储的数据
            });
            columns.push(column);
        });
        if (!$.isArray(this.options.columns[0])) {
            this.options.columns = [this.options.columns];
        }
        this.options.columns = $.extend(true, [], columns, this.options.columns);
        this.columns = [];
        this.fieldsColumnsIndex = [];

        setFieldIndex(this.options.columns);
        $.each(this.options.columns, function (i, columns) {
            $.each(columns, function (j, column) {
                column = $.extend({}, BootstrapTable.COLUMN_DEFAULTS, column);

                if (typeof column.fieldIndex !== 'undefined') {
                    that.columns[column.fieldIndex] = column;
                    that.fieldsColumnsIndex[column.field] = column.fieldIndex;
                }

                that.options.columns[i][j] = column;
            });
        });

        // if options.data is setting, do not process tbody data
        if (this.options.data.length) {
            return;
        }

        var m = [];
        this.$el.find('>tbody>tr').each(function (y) {
            var row = {};

            // save tr's id, class and data-* attributes
            row._id = $(this).attr('id');
            row._class = $(this).attr('class');
            row._data = getRealDataAttr($(this).data());

            $(this).find('>td').each(function (x) {
                var $this = $(this),
                    cspan = +$this.attr('colspan') || 1,
                    rspan = +$this.attr('rowspan') || 1,
                    tx, ty;

                for (; m[y] && m[y][x]; x++); //skip already occupied cells in current row

                for (tx = x; tx < x + cspan; tx++) { //mark matrix elements occupied by current cell with true
                    for (ty = y; ty < y + rspan; ty++) {
                        if (!m[ty]) { //fill missing rows
                            m[ty] = [];
                        }
                        m[ty][tx] = true;
                    }
                }

                var field = that.columns[x].field;

                row[field] = $(this).html();
                // save td's id, class and data-* attributes
                row['_' + field + '_id'] = $(this).attr('id');
                row['_' + field + '_class'] = $(this).attr('class');
                row['_' + field + '_rowspan'] = $(this).attr('rowspan');
                row['_' + field + '_colspan'] = $(this).attr('colspan');
                row['_' + field + '_title'] = $(this).attr('title');
                row['_' + field + '_data'] = getRealDataAttr($(this).data());
            });
            data.push(row);
        });
        this.options.data = data;
        if (data.length) this.fromHtml = true;
    };

    BootstrapTable.prototype.initHeader = function () {
        var that = this,
            visibleColumns = {},
            html = [];

        this.header = {
            fields: [],
            styles: [],
            classes: [],
            formatters: [],
            events: [],
            sorters: [],
            sortNames: [],
            cellStyles: [],
            searchables: []
        };

        //this.options.columns是个二维数组，可以定义复合表头
        $.each(this.options.columns, function (i, columns) {
            html.push('<tr>');

            if (i === 0 && !that.options.cardView && that.options.detailView) {
                html.push(sprintf('<th class="detail" rowspan="%s"><div class="fht-cell"></div></th>',
                    that.options.columns.length));
            }

            $.each(columns, function (j, column) {
                
                var text = '',
                    halign = '', // header align style
                    align = '', // body align style
                    style = '',
                    class_ = sprintf(' class="%s"', column['class']),
                    order = that.options.sortOrder || column.order,
                    unitWidth = 'px',
                    width = column.width;

                if (column.width !== undefined && (!that.options.cardView)) {
                    if (typeof column.width === 'string') {
                        if (column.width.indexOf('%') !== -1) { //自定义值里面包含百分号说明设定了一个百分比值
                            unitWidth = '%';
                        }
                    }
                }
                if (column.width && typeof column.width === 'string') {
                    width = column.width.replace('%', '').replace('px', '');
                }

                halign = sprintf('text-align: %s; ', column.halign ? column.halign : column.align);
                align = sprintf('text-align: %s; ', column.align);
                style = sprintf('vertical-align: %s; ', column.valign);
                style += sprintf('width: %s; ', (column.checkbox || column.radio) && !width ?
                    '36px' : (width ? width + unitWidth : undefined));

                if (typeof column.fieldIndex !== 'undefined') {
                    that.header.fields[column.fieldIndex] = column.field;
                    that.header.styles[column.fieldIndex] = align + style;
                    that.header.classes[column.fieldIndex] = class_;
                    that.header.formatters[column.fieldIndex] = column.formatter || that.options.tdFormatter
                    that.header.events[column.fieldIndex] = column.events;
                    that.header.sorters[column.fieldIndex] = column.sorter;
                    that.header.sortNames[column.fieldIndex] = column.sortName;
                    that.header.cellStyles[column.fieldIndex] = column.cellStyle;
                    that.header.searchables[column.fieldIndex] = column.searchable;

                    if (!column.visible) {
                        return;
                    }

                    if (that.options.cardView && (!column.cardVisible)) {
                        return;
                    }

                    visibleColumns[column.field] = column;
                }

                html.push('<th' + sprintf(' title="%s"', column.titleTooltip),
                    column.checkbox || column.radio ?
                        sprintf(' class="bs-checkbox %s"', column['class'] || '') :
                        class_,
                    sprintf(' style="%s"', halign + style),
                    sprintf(' rowspan="%s"', column.rowspan),
                    sprintf(' colspan="%s"', column.colspan),
                    sprintf(' data-field="%s"', column.field),
                    '>');

                html.push(sprintf('<div class="th-inner %s">', that.options.sortable && column.sortable ?
                    'sortable both' : ''));

                text = that.options.escape ? escapeHTML(column.title) : column.title;

                if (column.checkbox) {
                    if (!that.options.singleSelect && that.options.checkboxHeader) {
                        text = '<input name="btSelectAll" type="checkbox" />';
                    }
                    that.header.stateField = column.field;
                }
                if (column.radio) {
                    text = '';
                    that.header.stateField = column.field;
                    that.options.singleSelect = true;
                }

                html.push(text);
                html.push('</div>');
                html.push('<div class="fht-cell"></div>');
                html.push('</div>');
                html.push('</th>');
            });
            html.push('</tr>');
        });

        this.$header.html(html.join(''));
        this.$header.find('th[data-field]').each(function (i) {
            // 标题栏data属性写入各自的column数据，展开卡片式详情时使用
            $(this).data(visibleColumns[$(this).data('field')]);
        });
        this.$container.off('click', '.th-inner').on('click', '.th-inner', function (event) {
            var target = $(this);

            if (that.options.detailView) {
                if (target.closest('.bootstrap-table')[0] !== that.$container[0])
                    return false;
            }

            if (that.options.sortable && target.parent().data().sortable) {
                that.onSort(event);
            }
        });

        this.$header.children().children().off('keypress').on('keypress', function (event) {
            if (that.options.sortable && $(this).data().sortable) {
                var code = event.keyCode || event.which;
                if (code == 13) { //Enter keycode
                    that.onSort(event);
                }
            }
        });

        $(window).off('resize.bootstrap-table');
        if (!this.options.showHeader || this.options.cardView) {
            this.$header.hide(); //this.$header即是this.$elem下的thead元素; 
            this.$tableHeader.hide(); // this.$tableHeader即是.cui-table-container下表头元素.cui-table-header;
            this.$tableLoading.css('top', 0);
        } else {
            this.$header.show();
            this.$tableHeader.show();
            this.$tableLoading.css('top', this.$header.outerHeight() + 1);
            // Assign the correct sortable arrow
            this.getCaret();
            $(window).on('resize.bootstrap-table', $.proxy(this.resetWidth, this)); //$.proxy 方法接受一个已有的函数，并返回一个带特定上下文的新的函数
        }

        this.$selectAll = this.$header.find('[name="btSelectAll"]');
        this.$selectAll.off('click').on('click', function () {
                var checked = $(this).prop('checked');
                that[checked ? 'checkAll' : 'uncheckAll']();
                that.updateSelected();
            });
    };

    BootstrapTable.prototype.initFooter = function () {
        if (!this.options.showFooter || this.options.cardView) {
            this.$tableFooter.hide();
        } else {
            this.$tableFooter.show();
        }
    };

    /**
     * @param data
     * @param type: append / prepend
     */
    // 页面初始化时this.data赋值为this.options.data;  
    // ajax交互时this.data赋值为后台返回的数据，options.data也同样更新为后台返回的数据;  
    // type为append时，表格尾部插入数据，this.data、options.data尾部插入相应数据;  
    // type为prepend时，表格顶部插入数据，this.data、options.data头部插入相应数据;     
    BootstrapTable.prototype.initData = function (data, type) {
        if (type === 'append') {
            this.data = this.data.concat(data);
        } else if (type === 'prepend') {
            this.data = [].concat(data).concat(this.data);
        } else {
            this.data = data || this.options.data;
        }

        // Fix #839 Records deleted when adding new row on filtered table
        if (type === 'append') {
            this.options.data = this.options.data.concat(data);
        } else if (type === 'prepend') {
            this.options.data = [].concat(data).concat(this.options.data);
        } else {
            this.options.data = this.data;
        }


        // 前台分页的情况下调用this.initSort，后台分页以返回数据为准;
        if (this.options.sidePagination === 'server') {
            return;
        }
        this.initSort();
    };

    // onSort方法设置点击排序按钮时，更新options.sortName为相应标题栏column.field值;  
    // initSort由column.field值获得相应的sortName;  
    // 调用option.sorter函数或window[option.sorter]方法进行比较排序;  
    // 或者直接比较data[sortName]进行排序;  
    // 排序通过更新this.data数据实现,this.data渲染到页面使用initBody方法;
    BootstrapTable.prototype.initSort = function () {
        
        var that = this,
            name = this.options.sortName, //传入的排序列名
            order = this.options.sortOrder === 'desc' ? -1 : 1, //排序是倒序还是顺序
            index = $.inArray(this.options.sortName, this.header.fields), //排序列名在fileds里面的序号
            timeoutId = 0;
        if (this.options.customSort !== $.noop) { //判断用户有没有自定义排序方法
            this.options.customSort.apply(this, [this.options.sortName, this.options.sortOrder]);
            return;
        }

        //必须确保用户设置的排序关键字在this.header.fields数组里面
        if (index !== -1) {
            //sortStable设置为 true 将获得稳定的排序，我们会添加_position属性到 row 数据中
            if (this.options.sortStable) {
                $.each(this.data, function (i, row) {
                    row._position = i; //给每行数据定义一个编号
                });
            }

            this.data.sort(function (a, b) {
                
                //that.header.sortNames主要保存每一列自定义的作为本列sortName的值
                //为什么需要这个自定义功能？因为有时候该列title属性值可能是html，而我们需要的仅仅是里面的文字内容作为sortName
                if (that.header.sortNames[index]) {
                    name = that.header.sortNames[index];
                }
                // 获取每行数据的data[this.options.sortName] || data[that.header.sortNames[index]]的值，转义后返回  
                var aa = getItemField(a, name, that.options.escape),
                    bb = getItemField(b, name, that.options.escape),
                    // 调用column.sorter函数或window[column.sorter]方法进行比较，上下文是that.header  
                    // that.header.sorters里面存储了每一列自定义的比较方法
                    // 当that.header.sorters[index]不存在时，calculateObjectValue方法就会返回默认值，undefined
                    value = calculateObjectValue(that.header, that.header.sorters[index], [aa, bb]);

                if (value !== undefined) {
                    if (that.options.sortStable && value === 0) {
                        //当两个值相等时，保持原来的位置
                        return a._position - b._position;
                    }
                    return order * value; //倒序order = -1；顺序order = 1
                }

                // Fix #161: undefined or null string sort bug.
                if (aa === undefined || aa === null) {
                    aa = '';
                }
                if (bb === undefined || bb === null) {
                    bb = '';
                }

                if (that.options.sortStable && aa === bb) {
                    aa = a._position;
                    bb = b._position;
                    return a._position - b._position;
                }

                // IF both values are numeric, do a numeric comparison
                // jQuery.isNumeric()函数的返回值为Boolean类型，如果指定的参数是一个数字值或者字
                // 符串形式的数字（“1”，“0x123”等可以，“$0”，"123as"这种就不行），则返回true，否
                // 则返回false
                if ($.isNumeric(aa) && $.isNumeric(bb)) {
                    // Convert numerical values form string to float.
                    aa = parseFloat(aa);
                    bb = parseFloat(bb);
                    if (aa < bb) {
                        return order * -1;
                    }
                    return order;
                }

                if (aa === bb) {
                    return 0;
                }

                // If value is not a string, convert to string
                if (typeof aa !== 'string') {
                    aa = aa.toString();
                }

                //localeCompare用本地特定的顺序来比较两个字符串，返回值是个数字如果 stringObject
                //小于 target，则 localeCompare() 返回小于 0 的数。如果
                //stringObject 大于 target，则该方法返回大于 0
                //的数。如果两个字符串相等，或根据本地排序规则没有区别，该方法返回 0
                //localeCompare相当于是默认比较方法
                if (aa.localeCompare(bb) === -1) {
                    return order * -1;
                }

                return order;
            });

            if (this.options.sortClass !== undefined) {
                //这一部分功能是给当前排序列的所有td加上一个类名，this.options.sortClass指定类名名称
                clearTimeout(timeoutId);
                timeoutId = setTimeout(function () {
                    that.$el.removeClass(that.options.sortClass);
                    var index = that.$header.find(sprintf('[data-field="%s"]',
                        that.options.sortName)).index() + 1;
                    that.$el.find(sprintf('tr td:nth-child(%s)', index))
                        .addClass(that.options.sortClass);
                }, 250);
            }
        }
    };

    BootstrapTable.prototype.onSort = function (event) {
        var $this = event.type === "keypress" ? $(event.currentTarget) : $(event.currentTarget).parent(),
            $this_ = this.$header.find('th').eq($this.index());

        this.$header.add(this.$header_).find('span.order').remove();

        if (this.options.sortName === $this.data('field')) {
            this.options.sortOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.options.sortName = $this.data('field');
            if (this.options.rememberOrder) {
                this.options.sortOrder = $this.data('order') === 'asc' ? 'desc' : 'asc';
            } else {
                this.options.sortOrder = this.options.columns[0].filter(function(option) {
                    return option.field === $this.data('field');
                })[0].order;
            }
        }
        this.trigger('sort', this.options.sortName, this.options.sortOrder);

        $this.add($this_).data('order', this.options.sortOrder);

        // Assign the correct sortable arrow
        this.getCaret();

        if (this.options.sidePagination === 'server') {
            this.initServer(this.options.silentSort);
            return;
        }

        this.initSort();
        this.initBody();
    };

    // 创建工具栏内的用户自定义按钮组、分页显示隐藏切换按钮、刷新按钮、筛选条目按钮、以及卡片表格显示切换按钮、搜索框，并绑定相应事件；  
    // 筛选条目时触发column-switch事件;  
    BootstrapTable.prototype.initToolbar = function () {
        
        var that = this,
            html = [],
            timeoutId = 0,
            $keepOpen,
            $search,
            switchableCount = 0;

        if (this.$toolbar.find('.bs-bars').children().length) {
            $('body').append($(this.options.toolbar));
        }
        this.$toolbar.html('');

        if (typeof this.options.toolbar === 'string' || typeof this.options.toolbar === 'object') {
            $(sprintf('<div class="bs-bars pull-%s"></div>', this.options.toolbarAlign))
                .appendTo(this.$toolbar)
                .append($(this.options.toolbar));
        }

        // showColumns, showToggle, showRefresh
        html = [sprintf('<div class="columns columns-%s btn-group pull-%s">',
            this.options.buttonsAlign, this.options.buttonsAlign)];

        if (typeof this.options.icons === 'string') {
            this.options.icons = calculateObjectValue(null, this.options.icons);
        }

        if (this.options.showPaginationSwitch) { //showPaginationSwitch显示分页隐藏展示按钮
            html.push(sprintf('<button class="btn' +
                    sprintf(' btn-%s', this.options.buttonsClass) +
                    sprintf(' btn-%s', this.options.iconSize) +
                    '" type="button" name="paginationSwitch" aria-label="pagination Switch" title="%s">',
                    this.options.formatPaginationSwitch()),
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.paginationSwitchDown),
                '</button>');
        }

        if (this.options.showRefresh) {
            html.push(sprintf('<button class="btn' +
                    sprintf(' btn-%s', this.options.buttonsClass) +
                    sprintf(' btn-%s', this.options.iconSize) +
                    '" type="button" name="refresh" aria-label="refresh" title="%s">',
                    this.options.formatRefresh()),
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.refresh),
                '</button>');
        }

        if (this.options.showToggle) {
            html.push(sprintf('<button class="btn' +
                    sprintf(' btn-%s', this.options.buttonsClass) +
                    sprintf(' btn-%s', this.options.iconSize) +
                    '" type="button" name="toggle" aria-label="toggle" title="%s">',
                    this.options.formatToggle()),
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.toggle),
                '</button>');
        }

        if (this.options.showColumns) {
            html.push(sprintf('<div class="keep-open btn-group" title="%s">',
                    this.options.formatColumns()),
                '<button type="button" aria-label="columns" class="btn' +
                sprintf(' btn-%s', this.options.buttonsClass) +
                sprintf(' btn-%s', this.options.iconSize) +
                ' dropdown-toggle" data-toggle="dropdown">',
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.columns),
                ' <span class="caret"></span>',
                '</button>',
                '<ul class="dropdown-menu" role="menu">');

            $.each(this.columns, function (i, column) {
                if (column.radio || column.checkbox) {
                    return;
                }

                if (that.options.cardView && !column.cardVisible) {
                    return;
                }

                var checked = column.visible ? ' checked="checked"' : '';

                if (column.switchable) {
                    html.push(sprintf('<li role="menuitem">' +
                        '<label><input type="checkbox" data-field="%s" value="%s"%s> %s</label>' +
                        '</li>', column.field, i, checked, column.title));
                    switchableCount++;
                }
            });
            html.push('</ul>',
                '</div>');
        }

        html.push('</div>');

        // Fix #188: this.showToolbar is for extensions
        if (this.showToolbar || html.length > 2) {
            this.$toolbar.append(html.join(''));
        }

        if (this.options.showPaginationSwitch) {
            this.$toolbar.find('button[name="paginationSwitch"]')
                .off('click').on('click', $.proxy(this.togglePagination, this));
        }

        if (this.options.showRefresh) {
            this.$toolbar.find('button[name="refresh"]')
                .off('click').on('click', $.proxy(this.refresh, this));
        }

        if (this.options.showToggle) {
            this.$toolbar.find('button[name="toggle"]')
                .off('click').on('click', function () {
                    that.toggleView();
                });
        }

        if (this.options.showColumns) {
            $keepOpen = this.$toolbar.find('.keep-open');

            if (switchableCount <= this.options.minimumCountColumns) { //至少有一列数据
                $keepOpen.find('input').prop('disabled', true);
            }

            $keepOpen.find('li').off('click').on('click', function (event) {
                //stopImmediatePropagation
                //组织事件冒泡
                //还会阻止该元素剩余的其他事件处理函数的执行
                event.stopImmediatePropagation();
            });
            $keepOpen.find('input').off('click').on('click', function () {
                var $this = $(this);

                that.toggleColumn($(this).val(), $this.prop('checked'), false);
                that.trigger('column-switch', $(this).data('field'), $this.prop('checked'));
            });
        }

        if (this.options.search) {
            html = [];
            html.push(
                '<div class="pull-' + this.options.searchAlign + ' search">',
                sprintf('<input class="form-control' +
                    sprintf(' input-%s', this.options.iconSize) +
                    '" type="text" placeholder="%s">',
                    this.options.formatSearch()),
                '</div>');

            this.$toolbar.append(html.join(''));
            $search = this.$toolbar.find('.search input');
            $search.off('keyup drop blur').on('keyup drop blur', function (event) {
                if (that.options.searchOnEnterKey && event.keyCode !== 13) {
                    return;
                }

                if ($.inArray(event.keyCode, [37, 38, 39, 40]) > -1) {
                    return;
                }

                clearTimeout(timeoutId); // doesn't matter if it's 0
                timeoutId = setTimeout(function () {
                    that.onSearch(event);
                }, that.options.searchTimeOut);
            });

            if (isIEBrowser()) {
                $search.off('mouseup').on('mouseup', function (event) {
                    clearTimeout(timeoutId); // doesn't matter if it's 0
                    timeoutId = setTimeout(function () {
                        that.onSearch(event);
                    }, that.options.searchTimeOut);
                });
            }
        }
    };

    BootstrapTable.prototype.onSearch = function (event) {
        var text = $.trim($(event.currentTarget).val());

        // trim search input
        if (this.options.trimOnSearch && $(event.currentTarget).val() !== text) {
            $(event.currentTarget).val(text);
        }

        if (text === this.searchText) {
            return;
        }
        this.searchText = text;
        this.options.searchText = text;

        this.options.pageNumber = 1;
        this.initSearch();
        this.updatePagination();
        this.trigger('search', text);
    };

    BootstrapTable.prototype.initSearch = function () {
        var that = this;
        if (this.options.sidePagination !== 'server') { //sidePagination: "server", 服务端处理分页
            if (this.options.customSearch !== $.noop) {
                window[this.options.customSearch].apply(this, [this.searchText]);
                return;
            }

            var s = this.searchText && (this.options.escape ?
                escapeHTML(this.searchText) : this.searchText).toLowerCase();
            var f = $.isEmptyObject(this.filterColumns) ? null : this.filterColumns; //options.data和this.filterColumns相符则在this.data中保留，不相符则在this.data中删除;

            // Check filter
            // jQuery.grep( array, function [, invert ] )
            // array: 用于查询元素的类数组对象
            // function: 该函数来处理每项元素的比对。第一个参数是正在被检查的数组的元素，第二个参数是该元素的索引值。该函数应返回一个布尔值。this将是全局的window对象。
            // invert: 如果“invert”为false，或没有提供，函数返回一个“callback”中返回true的所有元素组成的数组。如果“invert”为true，函数返回一个“callback”中返回false的所有元素组成的数组
            this.data = f ? $.grep(this.options.data, function (item, i) {
                
                for (var key in f) {
                    // f[key]是数组时，判断item[key]在不在数组里面，f[key]是一个值时，判断item[key]是否等于f[key]
                    if ($.isArray(f[key]) && $.inArray(item[key], f[key]) === -1 ||
                            !$.isArray(f[key]) && item[key] !== f[key]) {
                        return false;
                    }
                }
                return true;
            }) : this.options.data;


            this.data = s ? $.grep(this.data, function (item, i) {
                for (var j = 0; j < that.header.fields.length; j++) {

                    

                    if (!that.header.searchables[j]) {
                        continue;
                    }

                    var key = $.isNumeric(that.header.fields[j]) ? parseInt(that.header.fields[j], 10) : that.header.fields[j];
                    var column = that.columns[that.fieldsColumnsIndex[key]];
                    var value;

                    if (typeof key === 'string') {
                        value = item;
                        var props = key.split('.');
                        for (var prop_index = 0; prop_index < props.length; prop_index++) {
                            value = value[props[prop_index]];
                        }

                        // Fix #142: respect searchForamtter boolean
                        if (column && column.searchFormatter) {
                            value = calculateObjectValue(column,
                                that.header.formatters[j], [value, item, i], value);
                        }
                    } else {
                        value = item[key];
                    }

                    if (typeof value === 'string' || typeof value === 'number') {
                        if (that.options.strictSearch) { //精确查询
                            if ((value + '').toLowerCase() === s) {
                                return true;
                            }
                        } else { //模糊查询
                            if ((value + '').toLowerCase().indexOf(s) !== -1) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            }) : this.data;
        }
    };

    // 初始化设置分页相关页面信息显示情况，包括当前页显示第几条到第几天数据，共几条数据，每页显示几条数据;  
    // 以及每页显示数据量切换按钮，选择页面的分页栏显示情况，再绑定事件;  
    // 通过options.pageNumber获取this.pageFrom、this.pageTo，以便前台分页时initBody获取相应数据;
    BootstrapTable.prototype.initPagination = function () {
        //显示或者隐藏分页条
        if (!this.options.pagination) {
            this.$pagination.hide();
            return;
        } else {
            this.$pagination.show();
        }

        var that = this,
            html = [],
            //为真时，显示所有数据条目，同时显示数据量切换按钮文本改为options.formatAllRows()
            $allSelected = false,   
            i, from, to,
            $pageList,
            $first, $pre,
            $next, $last,
            $number,
            data = this.getData(),//调用方法获取数据
            pageList = this.options.pageList;  //pageList:每页表格显示条数的选择工具

        //当数据是从服务器取过来的时候，数据的总量应该是服务器那边传过来的
        if (this.options.sidePagination !== 'server') {
            this.options.totalRows = data.length; //this.options.totalRows：数据总条数
        }

        this.totalPages = 0; //this.totalPages数据总页数
        if (this.options.totalRows) {
            // this.options.pageSize一页显示几条数据，显示数据量切换按钮默认文本;
            if (this.options.pageSize === this.options.formatAllRows()) { 
                //当options.pageSize和options.formatAllRows()相同时，意味显示所有条目
                this.options.pageSize = this.options.totalRows;
                $allSelected = true;
            } else if (this.options.pageSize === this.options.totalRows) { //数据总条数刚好跟每页显示数量相同
                // Fix #667 Table with pagination,
                // multiple pages and a search that matches to one page throws exception
                // this.options.pageList希望传入的是数组，但是如果传入的是数组的字符串形式，下面的功能就会重新把它转成字符串
                var pageLst = typeof this.options.pageList === 'string' ?
                    this.options.pageList.replace('[', '').replace(']', '')
                        .replace(/ /g, '').toLowerCase().split(',') : this.options.pageList;
                //判断pagelist中有没有all这个选项
                if ($.inArray(this.options.formatAllRows().toLowerCase(), pageLst)  > -1) { 
                    $allSelected = true;
                }
            }

            this.totalPages = ~~((this.options.totalRows - 1) / this.options.pageSize) + 1; //计算表格的总页数
            // ～～其实是一种利用符号进行的类型转换,转换成数字类型
            // ~~true = 1     ~~false = 0     ~~"" = 0     ~~[] = 0     ~~undefined =0     ~~!undefined = 1     ~~null = 0     ~~!null = 1    

            this.options.totalPages = this.totalPages;
        }

        // 如果一条数据都没有，则this.totalPages = 0
        // this.options.pageNumber当前页页码
        if (this.totalPages > 0 && this.options.pageNumber > this.totalPages) { 
            this.options.pageNumber = this.totalPages;
        }

        this.pageFrom = (this.options.pageNumber - 1) * this.options.pageSize + 1; // this.pageFrom当前页从总数据的第几条开始;
        this.pageTo = this.options.pageNumber * this.options.pageSize; // this.pageTo当前页到总数据的第几条为止;
        //this.pageTo = this.pageFrom + this.options.pageSize -1
        if (this.pageTo > this.options.totalRows) {
            this.pageTo = this.options.totalRows;
        }

        html.push(
            //this.options.paginationDetailHAlign: right, left 每页几行数据显示区浮动情况
            //this.options.onlyInfoPagination: 分页文案提示只显示有多少条数据,设置为true时只会显示数据总条数，也翻页都不会显示
            '<div class="pull-' + this.options.paginationDetailHAlign + ' pagination-detail">', 
            '<span class="pagination-info">',
            this.options.onlyInfoPagination ? this.options.formatDetailPagination(this.options.totalRows) : // return sprintf('Showing %s rows', totalRows);
            this.options.formatShowingRows(this.pageFrom, this.pageTo, this.options.totalRows), //return sprintf('Showing %s to %s of %s rows', pageFrom, pageTo, totalRows)
            '</span>');  

        if (!this.options.onlyInfoPagination) { 
            html.push('<span class="page-list">');

            var pageNumber = [
                    sprintf('<span class="btn-group %s">',
                        this.options.paginationVAlign === 'top' || this.options.paginationVAlign === 'both' ?
                            'dropdown' : 'dropup'),
                    '<button type="button" class="btn' +
                    sprintf(' btn-%s', this.options.buttonsClass) +
                    sprintf(' btn-%s', this.options.iconSize) +
                    ' dropdown-toggle" data-toggle="dropdown">',
                    '<span class="page-size">',
                    $allSelected ? this.options.formatAllRows() : this.options.pageSize, //pagelist里面显示的数据
                    '</span>',
                    ' <span class="caret"></span>',
                    '</button>',
                    '<ul class="dropdown-menu" role="menu">'
                ];

            if (typeof this.options.pageList === 'string') {
                var list = this.options.pageList.replace('[', '').replace(']', '')
                    .replace(/ /g, '').split(','); //将一个字符串化的数组重新转换为数组类型

                pageList = [];
                $.each(list, function (i, value) {
                    pageList.push(value.toUpperCase() === that.options.formatAllRows().toUpperCase() ?
                        that.options.formatAllRows() : +value);
                });
            }

            //这个功能是用来高亮当前每页显示多少条那个选项
            $.each(pageList, function (i, page) { 
                // this.options.smartDisplay为真，当总页数为1时，屏蔽分页，以及下拉列表仅有一条时，屏蔽切换条目数按钮下拉功能
                if (!that.options.smartDisplay || i === 0 || pageList[i - 1] < that.options.totalRows) {
                    var active;
                    if ($allSelected) {
                        active = page === that.options.formatAllRows() ? ' class="active"' : '';
                    } else {
                        active = page === that.options.pageSize ? ' class="active"' : '';
                    }
                    pageNumber.push(sprintf('<li role="menuitem"%s><a href="#">%s</a></li>', active, page));
                }
            });
            pageNumber.push('</ul></span>');

            html.push(this.options.formatRecordsPerPage(pageNumber.join(''))); //return sprintf('%s records per page', pageNumber);  
            html.push('</span>');

            html.push('</div>',
                //this.options.paginationHAlign： right, left 分页浮动设置
                '<div class="pull-' + this.options.paginationHAlign + ' pagination">',  
                '<ul class="pagination' + sprintf(' pagination-%s', this.options.iconSize) + '">',
                //this.options.paginationPreText: 前一页按钮的显示文字
                '<li class="page-pre"><a href="#">' + this.options.paginationPreText + '</a></li>'); 

            // 分页  
            // 策略：通过from初始页、to结尾页，先设置首页起的显示情况，再设置...按钮的显示情况，接着尾页的显示情况  
            // 顺序设置，由一般到具体
            
            if (this.totalPages < 5) {
                from = 1;
                to = this.totalPages;
            } else {
                from = this.options.pageNumber - 2; //this.options.pageNumber： 初始化显示第几页
                to = from + 4;
                if (from < 1) {
                    from = 1;
                    to = 5;
                }
                if (to > this.totalPages) {
                    to = this.totalPages;
                    from = to - 4;
                }
            }

            // 总页数大于6时，显示第一页，最后一页，pageNumber--，pageNumber，pageNumber++，以及两串...  
            if (this.totalPages >= 6) {
                if (this.options.pageNumber >= 3) {
                    html.push('<li class="page-first' + (1 === this.options.pageNumber ? ' active' : '') + '">',
                        '<a href="#">', 1, '</a>',
                        '</li>');

                    from++;
                }

                if (this.options.pageNumber >= 4) {
                    if (this.options.pageNumber == 4 || this.totalPages == 6 || this.totalPages == 7) {
                        from--;
                    } else {
                        html.push('<li class="page-first-separator disabled">',
                            '<a href="#">...</a>',
                            '</li>');
                    }

                    to--;
                }
            }

            if (this.totalPages >= 7) {
                if (this.options.pageNumber >= (this.totalPages - 2)) {
                    from--;
                }
            }

            if (this.totalPages == 6) {
                if (this.options.pageNumber >= (this.totalPages - 2)) {
                    to++;
                }
            } else if (this.totalPages >= 7) {
                if (this.totalPages == 7 || this.options.pageNumber >= (this.totalPages - 3)) {
                    to++;
                }
            }

            //设置当前项
            for (i = from; i <= to; i++) {
                html.push('<li class="page-number' + (i === this.options.pageNumber ? ' active' : '') + '">',
                    '<a href="#">', i, '</a>',
                    '</li>');
            }

            if (this.totalPages >= 8) {
                if (this.options.pageNumber <= (this.totalPages - 4)) {
                    html.push('<li class="page-last-separator disabled">',
                        '<a href="#">...</a>',
                        '</li>');
                }
            }

            if (this.totalPages >= 6) {
                if (this.options.pageNumber <= (this.totalPages - 3)) {
                    html.push('<li class="page-last' + (this.totalPages === this.options.pageNumber ? ' active' : '') + '">',
                        '<a href="#">', this.totalPages, '</a>',
                        '</li>');
                }
            }

            html.push(
                '<li class="page-next"><a href="#">' + this.options.paginationNextText + '</a></li>',
                '</ul>',
                '</div>');
        }
        this.$pagination.html(html.join(''));

        if (!this.options.onlyInfoPagination) {
            $pageList = this.$pagination.find('.page-list a'); //用来绑定每页显示条数的选择事件
            $first = this.$pagination.find('.page-first'); //第一页按钮
            $pre = this.$pagination.find('.page-pre'); //前一页按钮
            $next = this.$pagination.find('.page-next'); //后一页按钮
            $last = this.$pagination.find('.page-last'); //最后一页按钮
            $number = this.$pagination.find('.page-number'); //除第一页和最后一页页码按钮

            if (this.options.smartDisplay) {
                if (this.totalPages <= 1) {
                    this.$pagination.find('div.pagination').hide(); //smartDisplay为真且页面总数小于等于1就隐藏分页条
                }
                if (pageList.length < 2 || this.options.totalRows <= pageList[0]) {
                    this.$pagination.find('span.page-list').hide();
                }

                // when data is empty, hide the pagination
                this.$pagination[this.getData().length ? 'show' : 'hide']();
            }

            if (!this.options.paginationLoop) { //paginationLoop设置为真时，在最后一页再点击下一页会回到第一页
                if (this.options.pageNumber === 1) {
                    $pre.addClass('disabled'); //向前一页不可点
                }
                if (this.options.pageNumber === this.totalPages) {
                    $next.addClass('disabled'); //向后一页不可点
                }
            }

            if ($allSelected) {
                this.options.pageSize = this.options.formatAllRows();
            }
            $pageList.off('click').on('click', $.proxy(this.onPageListChange, this)); //$.proxy 方法接受一个已有的函数，并返回一个带特定上下文的新的函数
            $first.off('click').on('click', $.proxy(this.onPageFirst, this));
            $pre.off('click').on('click', $.proxy(this.onPagePre, this));
            $next.off('click').on('click', $.proxy(this.onPageNext, this));
            $last.off('click').on('click', $.proxy(this.onPageLast, this));
            $number.off('click').on('click', $.proxy(this.onPageNumber, this));
        }
    };

    BootstrapTable.prototype.updatePagination = function (event) {
        // Fix #171: IE disabled button can be clicked bug.
        if (event && $(event.currentTarget).hasClass('disabled')) {
            return;
        }

        // maintainSelected为否时，调用resetRows重置复选框为不选中，调用initServer交互或initbody渲染页面;  
        if (!this.options.maintainSelected) {   
            this.resetRows();
        }

        this.initPagination();
        if (this.options.sidePagination === 'server') {
            this.initServer(); // initSever由后台返回数据;
        } else {
            this.initBody(); // initBody由options.pageFrom、options.pageTo获取需要渲染的数据data;
        }

        this.trigger('page-change', this.options.pageNumber, this.options.pageSize); // 触发page-change事件; 
    };

    BootstrapTable.prototype.onPageListChange = function (event) {
        var $this = $(event.currentTarget);

        $this.parent().addClass('active').siblings().removeClass('active'); //切换高亮选项
        this.options.pageSize = $this.text().toUpperCase() === this.options.formatAllRows().toUpperCase() ?
            this.options.formatAllRows() : +$this.text();
        this.$toolbar.find('.page-size').text(this.options.pageSize);

        this.updatePagination(event);
        return false;
    };

    BootstrapTable.prototype.onPageFirst = function (event) {
        this.options.pageNumber = 1;
        this.updatePagination(event);
        return false;
    };

    BootstrapTable.prototype.onPagePre = function (event) {
        if ((this.options.pageNumber - 1) === 0) { //在首页点击前一页按钮，则切换到最后一页
            this.options.pageNumber = this.options.totalPages;
        } else {
            this.options.pageNumber--;
        }
        this.updatePagination(event);
        return false;
    };

    BootstrapTable.prototype.onPageNext = function (event) {
        if ((this.options.pageNumber + 1) > this.options.totalPages) {
            this.options.pageNumber = 1;
        } else {
            this.options.pageNumber++;
        }
        this.updatePagination(event);
        return false;
    };

    BootstrapTable.prototype.onPageLast = function (event) {
        this.options.pageNumber = this.totalPages;
        this.updatePagination(event);
        return false;
    };

    BootstrapTable.prototype.onPageNumber = function (event) {
        //+$(event.currentTarget).text(): 将字符串转换为数字类型
        if (this.options.pageNumber === +$(event.currentTarget).text()) { //如果点击的是当前高亮选项则直接返回
            return;
        }
        this.options.pageNumber = +$(event.currentTarget).text();
        this.updatePagination(event);
        return false;
    };

    /**
     * [initRow description]
     * @param  {[type]} item      本条数据
     * @param  {[type]} i         本条数据的索引值
     * @param  {[type]} data      所有数据
     * @param  {[type]} parentDom 父节点
     * @return {[type]}           返回一个html字符串
     */
    BootstrapTable.prototype.initRow = function(item, i, data, parentDom) {
        
        var that=this,
            key,
            html = [],
            style = {},
            csses = [],
            data_ = '',
            attributes = {},
            htmlAttributes = [];

        if ($.inArray(item, this.hiddenRows) > -1) { //如果这条数据属于隐藏数据，直接返回
            return;
        }
        // 通过options.rowStyle(row,index)函数或window[options.rowStyle](row,index)(options.rowStyle的值是一个函数名)获取tbody>tr样式 
        // style.classes用来给tr元素添加类，style.css对象用来给该tr元素内部的td元素添加行内样式 
        style = calculateObjectValue(this.options, this.options.rowStyle, [item, i], style);

        if (style && style.css) {
            for (key in style.css) {
                csses.push(key + ': ' + style.css[key]); //csses等会用来给每个单元格设置属性
            }
        }

        //给每一个tr添加属性， this.options.rowAttributes返回一个对象，对象里面每一个键值对都对应一个属性和他的属性值
        attributes = calculateObjectValue(this.options,
            this.options.rowAttributes, [item, i], attributes);

        if (attributes) {
            for (key in attributes) {
                htmlAttributes.push(sprintf('%s="%s"', key, escapeHTML(attributes[key])));
            }
        }

        //为每个tr指定私有数据，传入的方式是通过在每条数据中塞入_data对象，该对象的每一个键值对对应一个私有属性
        if (item._data && !$.isEmptyObject(item._data)) { //jQuery.isEmptyObject()函数用于判断指定参数是否是一个空对象,jQuery.isEmptyObject()是通过for...in循环来进行判断
            $.each(item._data, function(k, v) {
                // ignore data-index
                if (k === 'index') { //data-index是默认用来显示行号的，不允许用户进行改变
                    return;
                }
                data_ += sprintf(' data-%s="%s"', k, v);
            });
        }

        html.push('<tr',
            sprintf(' %s', htmlAttributes.join(' ')),
            sprintf(' id="%s"', $.isArray(item) ? undefined : item._id), //每一个tr的id属性可以通过item._id和rowAttributes两种方式添加
            sprintf(' class="%s"', style.classes || ($.isArray(item) ? undefined : item._class)),
            sprintf(' data-index="%s"', i),
            sprintf(' data-uniqueid="%s"', item[this.options.uniqueId]),
            sprintf('%s', data_),
            '>'
        );

        if (this.options.cardView) {
            html.push(sprintf('<td colspan="%s"><div class="card-views">', this.header.fields.length));
        }

        //detailView 表格显示数据时，每行数据前是否有点击按钮，显示这行数据的卡片式详情
        if (!this.options.cardView && this.options.detailView) { 
            html.push('<td>');
            var str = calculateObjectValue(null, this.options.detailFilter, [i, item])
            if (calculateObjectValue(null, this.options.detailFilter, [i, item])) {
                html.push('<a class="detail-icon" href="javascript:">',
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.detailOpen),
                '</a>');
            }
            //iconsPrefix: 'glyphicon', // 按钮通用样式
            //detailOpen: 'glyphicon-plus icon-plus',// 卡片式详情展开按钮  
            //detailClose: 'glyphicon-minus icon-minus'// 卡片式详情折叠按钮

            html.push('</td>');
        }

        $.each(this.header.fields, function(j, field) {
        
            var text = '',
                //value_本条数据，field属性的值
                value_ = getItemField(item, field, that.options.escape),
                value = '',
                type = '',
                cellStyle = {},
                id_ = '',
                class_ = that.header.classes[j],
                data_ = '',
                rowspan_ = '',
                colspan_ = '',
                title_ = '',
                column = that.columns[j];

            if (that.fromHtml && typeof value_ === 'undefined') {
                if((!column.checkbox) && (!column.radio)) {
                    return;
                }
            }

            if (!column.visible) {
                return;
            }

            if (that.options.cardView && (!column.cardVisible)) {
                return;
            }

            if (column.escape) {
                value_ = escapeHTML(value_);
            }

            //csses是前面rowStyle函数得到的
            style = sprintf('style="%s"', csses.concat(that.header.styles[j]).join('; '));

            // handle td's id and class
            if (item['_' + field + '_id']) {
                id_ = sprintf(' id="%s"', item['_' + field + '_id']);
            }
            if (item['_' + field + '_class']) {
                class_ = sprintf(' class="%s"', item['_' + field + '_class']);
            }
            if (item['_' + field + '_rowspan']) {
                rowspan_ = sprintf(' rowspan="%s"', item['_' + field + '_rowspan']);
            }
            if (item['_' + field + '_colspan']) {
                colspan_ = sprintf(' colspan="%s"', item['_' + field + '_colspan']);
            }
            if (item['_' + field + '_title']) {
                title_ = sprintf(' title="%s"', item['_' + field + '_title']);
            }

            // 调用that.header.cellStyles[j](item.field,item,i)设置本列单元格显示样式
            // 通过调用每列设置的cellStyle函数定制单元格的样式
            cellStyle = calculateObjectValue(that.header,
                that.header.cellStyles[j], [value_, item, i, field], cellStyle);
            if (cellStyle.classes) {
                class_ = sprintf(' class="%s"', cellStyle.classes);
            }
            if (cellStyle.css) {
                var csses_ = [];
                for (var key in cellStyle.css) {
                    csses_.push(key + ': ' + cellStyle.css[key]);
                }
                style = sprintf('style="%s"', csses_.concat(that.header.styles[j]).join('; '));
            }
            //调用方法返回td里面的值
            // 调用that.header.formatters[j](item.field,item,i)格式化显示内容  
            // 特别当单元格是复选框的时候，value返回值可以是对象形式{checked:true;disabled:true}，此时无显示文本  
            value = calculateObjectValue(column,
                that.header.formatters[j], [value_, item, i, field], value_);

            if (item['_' + field + '_data'] && !$.isEmptyObject(item['_' + field + '_data'])) {
                $.each(item['_' + field + '_data'], function(k, v) {
                    // ignore data-index
                    if (k === 'index') {
                        return;
                    }
                    data_ += sprintf(' data-%s="%s"', k, v);
                });
            }
            //checkbox或者radio所在列的formatter方法是返回一个json对象，这个json对象包含的属性是disabled，checked这些属性
            if (column.checkbox || column.radio) {
                type = column.checkbox ? 'checkbox' : type;
                type = column.radio ? 'radio' : type;

                text = [sprintf(that.options.cardView ?
                        '<div class="card-view %s">' : '<td class="bs-checkbox %s">', column['class'] || ''),
                    '<input' +
                    sprintf(' data-index="%s"', i) +
                    sprintf(' name="%s"', that.options.selectItemName) +   //that.options.selectItemName: radio or checkbox 的字段名,默认是'btSelectItem'
                    sprintf(' type="%s"', type) +
                    sprintf(' value="%s"', item[that.options.idField]) + //item[that.options.idField]：该条数据的主键值
                    sprintf(' checked="%s"', value === true ||
                        (value_ || value && value.checked) ? 'checked' : undefined) +
                    sprintf(' disabled="%s"', !column.checkboxEnabled ||    //checkboxEnabled：复选框是否可选
                        (value && value.disabled) ? 'disabled' : undefined) +
                    //that.header.formatters[j] && typeof value === 'string' ? value : '',加上这一行就可以让formatter方法返回一个html属性的字符串
                    ' />',
                    that.header.formatters[j] && typeof value === 'string' ? value : '',
                    that.options.cardView ? '</div>' : '</td>'
                ].join('');

                // 复选框上传内容字段名属性后添加true选中/false未选中值
                item[that.header.stateField] = value === true || (value && value.checked);
            } else {
                value = typeof value === 'undefined' || value === null ?
                    that.options.undefinedText : value;

                // getPropertyFromOther卡片式显示时获取标题栏的文本内容
                text = that.options.cardView ? ['<div class="card-view">',
                    that.options.showHeader ? sprintf('<span class="title" %s>%s</span>', style,
                        getPropertyFromOther(that.columns, 'field', 'title', field)) : '',
                    sprintf('<span class="value">%s</span>', value),
                    '</div>'
                ].join('') : [sprintf('<td%s %s %s %s %s %s %s>',
                        id_, class_, style, data_, rowspan_, colspan_, title_),
                    value,
                    '</td>'
                ].join('');

                // Hide empty data on Card view when smartDisplay is set to true.
                if (that.options.cardView && that.options.smartDisplay && value === '') {
                    // Should set a placeholder for event binding correct fieldIndex
                    // 占位符，以利于根据元素序号准确地绑定事件
                    text = '<div class="card-view"></div>';
                }
            }

            html.push(text);
        });

        if (this.options.cardView) {
            html.push('</div></td>');
        }
        html.push('</tr>');

        return html.join(' ');
    };

    BootstrapTable.prototype.initBody = function (fixedScroll) {
        var that = this,
            html = [],
            data = this.getData(); // 获取搜索过滤后的数据
            // [{   // 行tr中的属性设置  
            //      _data:{  
            //          index:1,// 后续会自动赋值为数据在当前页的所在行号  
            //          field:field  
            //      },  
            //      _id:id,  
            //      _class:class,  
            //      field1:value1,field2:value2, //填充在单元格中的显示内容，从this.header.fields数组中获取属性名field1等  
            //      _field_id  
            // }] // 每一行特定的样式、属性根据this.options.rowStyle、this.options.rowAttributes获取  
            // 数组形式  
            // [["field","class"]] // 数组形式不能对每一行添加特定的data属性、id以及class  
            //                     // 特定的的样式、属性仍可由this.options.rowStyle、this.options.rowAttributes获取  
            //                     // 以及data-index添加行号、data-uniqueId每行的唯一标识，根据options.uniqueId从data中获取  
            //                       
            // tr以及checkbox中data数组的序号data-index，以便于获取data[data-index]数据调用

        this.trigger('pre-body', data);

        //看有没有tbody，没有就创建一个
        this.$body = this.$el.find('>tbody');
        if (!this.$body.length) {
            this.$body = $('<tbody></tbody>').appendTo(this.$el);
        }

        //Fix #389 Bootstrap-table-flatJSON is not working

        if (!this.options.pagination || this.options.sidePagination === 'server') {
            this.pageFrom = 1;
            this.pageTo = data.length;
        }

        var trFragments = $(document.createDocumentFragment());
        var hasTr;

        for (var i = this.pageFrom - 1; i < this.pageTo; i++) {
            var item = data[i];
            var tr = this.initRow(item, i, data, trFragments);
            hasTr = hasTr || !!tr;
            if (tr&&tr!==true) {
                trFragments.append(tr);
            }
        }

        // show no records
        if (!hasTr) {
            trFragments.append('<tr class="no-records-found">' +
                sprintf('<td colspan="%s">%s</td>',
                this.$header.find('th').length,
                this.options.formatNoMatches()) + // return 'No matching records found';
                '</tr>');
        }

        this.$body.html(trFragments);

        if (!fixedScroll) {
            this.scrollTo(0);
        }

        // click to select by column
        this.$body.find('> tr[data-index] > td').off('click dblclick').on('click dblclick', function (e) {
            var $td = $(this),
                $tr = $td.parent(),
                item = that.data[$tr.data('index')],
                index = $td[0].cellIndex,
                fields = that.getVisibleFields(),
                field = fields[that.options.detailView && !that.options.cardView ? index - 1 : index],
                column = that.columns[that.fieldsColumnsIndex[field]],
                value = getItemField(item, field, that.options.escape);

            if ($td.find('.detail-icon').length) {
                return;
            }

            that.trigger(e.type === 'click' ? 'click-cell' : 'dbl-click-cell', field, value, item, $td);
            that.trigger(e.type === 'click' ? 'click-row' : 'dbl-click-row', item, $tr, field);

            // if click to select - then trigger the checkbox/radio click
            // 两个clickToSelect属性用来控制能不能通过点击单元格选中该行
            if (e.type === 'click' && that.options.clickToSelect && column.clickToSelect) {
                var $selectItem = $tr.find(sprintf('[name="%s"]', that.options.selectItemName));
                if ($selectItem.length) {
                    $selectItem[0].click(); // #144: .trigger('click') bug
                }
            }
        });

        //表格显示，点击行首icon打开或者关闭cardview
        this.$body.find('> tr[data-index] > td > .detail-icon').off('click').on('click', function () {
            
            var $this = $(this),
                $tr = $this.parent().parent(),
                index = $tr.data('index'),
                row = data[index]; // Fix #980 Detail view, when searching, returns wrong row

            // remove and update
            // 有打开详情功能时，每一条数据的下面都会有一个对应的tr.detail-view
            if ($tr.next().is('tr.detail-view')) {
                //设置打开详情按钮的图标
                $this.find('i').attr('class', sprintf('%s %s', that.options.iconsPrefix, that.options.icons.detailOpen));
                that.trigger('collapse-row', index, row);
                $tr.next().remove();
            } else {
                $this.find('i').attr('class', sprintf('%s %s', that.options.iconsPrefix, that.options.icons.detailClose));
                $tr.after(sprintf('<tr class="detail-view"><td colspan="%s"></td></tr>', $tr.find('td').length));
                var $element = $tr.next().find('td');
                var content = calculateObjectValue(that.options, that.options.detailFormatter, [index, row, $element], '');
                if($element.length === 1) {
                    //直接将返回的内容载入到单元格中
                    $element.append(content);
                }
                that.trigger('expand-row', index, row, $element);
            }
            that.resetView();
            return false;
        });

        //获取所有checkbox或者radio对象
        this.$selectItem = this.$body.find(sprintf('[name="%s"]', this.options.selectItemName));
        this.$selectItem.off('click').on('click', function (event) {
            event.stopImmediatePropagation();

            var $this = $(this),
                checked = $this.prop('checked'),
                row = that.data[$this.data('index')];

            //如果是单选框先取消所有单选框的选中状态
            if (that.options.maintainSelected && $(this).is(':radio')) {
                $.each(that.options.data, function (i, row) {
                    row[that.header.stateField] = false;
                });
            }

            row[that.header.stateField] = checked;

            //多选框设置单选时进行以下处理
            if (that.options.singleSelect) {
                that.$selectItem.not(this).each(function () {
                    that.data[$(this).data('index')][that.header.stateField] = false;
                });
                that.$selectItem.filter(':checked').not(this).prop('checked', false);
            }

            that.updateSelected();
            that.trigger(checked ? 'check' : 'uncheck', row, $this);
        });

        $.each(this.header.events, function (i, events) {
            if (!events) {
                return;
            }
            // fix bug, if events is defined with namespace
            if (typeof events === 'string') {
                events = calculateObjectValue(null, events);
            }

            var field = that.header.fields[i],
                fieldIndex = $.inArray(field, that.getVisibleFields());

            if (that.options.detailView && !that.options.cardView) {
                fieldIndex += 1;
            }

            for (var key in events) {
                that.$body.find('>tr:not(.no-records-found)').each(function () {
                    var $tr = $(this),
                        $td = $tr.find(that.options.cardView ? '.card-view' : 'td').eq(fieldIndex),
                        index = key.indexOf(' '),
                        name = key.substring(0, index),
                        el = key.substring(index + 1),
                        func = events[key];

                    $td.find(el).off(name).on(name, function (e) {
                        var index = $tr.data('index'),
                            row = that.data[index],
                            value = row[field];

                        func.apply(this, [e, value, row, index]);
                    });
                });
            }
        });

        this.updateSelected();
        this.resetView();

        this.trigger('post-body', data);
    };

    BootstrapTable.prototype.initServer = function (silent, query, url) {
        var that = this,
            data = {},
            params = {
                searchText: this.searchText,
                sortName: this.options.sortName,
                sortOrder: this.options.sortOrder
            },
            request;

        if (this.options.pagination) {
            params.pageSize = this.options.pageSize === this.options.formatAllRows() ?
                this.options.totalRows : this.options.pageSize;
            params.pageNumber = this.options.pageNumber;
        }

        if (!(url || this.options.url) && !this.options.ajax) {
            return;
        }

        //queryParamsType设置为 'limit' 则会发送符合 RESTFul 格式的参数
        if (this.options.queryParamsType === 'limit') {
            params = {
                search: params.searchText,
                sort: params.sortName,
                order: params.sortOrder
            };

            if (this.options.pagination) {
                params.offset = this.options.pageSize === this.options.formatAllRows() ?
                    0 : this.options.pageSize * (this.options.pageNumber - 1);
                params.limit = this.options.pageSize === this.options.formatAllRows() ?
                    this.options.totalRows : this.options.pageSize;
            }
        }

        if (!($.isEmptyObject(this.filterColumnsPartial))) {
            params.filter = JSON.stringify(this.filterColumnsPartial, null);
        }

        data = calculateObjectValue(this.options, this.options.queryParams, [params], data);

        $.extend(data, query || {});

        // false to stop request
        if (data === false) {
            return;
        }
        //设置重新从server加载数据时是不是显示提示文字
        if (!silent) {
            this.$tableLoading.show();
        }
        request = $.extend({}, calculateObjectValue(null, this.options.ajaxOptions), {
            type: this.options.method,
            url:  url || this.options.url,
            data: this.options.contentType === 'application/json' && this.options.method === 'post' ?
                JSON.stringify(data) : data,
            cache: this.options.cache,
            contentType: this.options.contentType,
            dataType: this.options.dataType,
            success: function (res) {
                //responseHandler用来对返回数据进行转换
                res = calculateObjectValue(that.options, that.options.responseHandler, [res], res);

                that.load(res); //将表格原来的数据全部替换
                that.trigger('load-success', res);
                if (!silent) that.$tableLoading.hide();
            },
            error: function (res) {
                that.trigger('load-error', res.status, res);
                if (!silent) that.$tableLoading.hide();
            }
        });

        //ajax: 方法，自定义 AJAX 方法,须实现 jQuery AJAX API
        if (this.options.ajax) {
            //自定义ajax方法了就执行自定义的方法，否则就执行简单的$.ajax方法
            calculateObjectValue(this, this.options.ajax, [request], null);
        } else {
            if (this._xhr && this._xhr.readyState !== 4) {
                this._xhr.abort();
            }
            this._xhr = $.ajax(request);
        }
    };

    BootstrapTable.prototype.initSearchText = function () {
        if (this.options.search) {
            if (this.options.searchText !== '') {
                var $search = this.$toolbar.find('.search input');
                $search.val(this.options.searchText);
                this.onSearch({currentTarget: $search});
            }
        }
    };

    BootstrapTable.prototype.getCaret = function () {
        var that = this;

        $.each(this.$header.find('th'), function (i, th) {
            $(th).find('.sortable').removeClass('desc asc').addClass($(th).data('field') === that.options.sortName ? that.options.sortOrder : 'both');
        });
    };

    BootstrapTable.prototype.updateSelected = function () {
        
        //$(":enabled") 选择所有启用的 <input> 和 <button> 元素
        //当所有可操作checkbox的数量等于所有选中的checkbox的数量时，则认为是全部选中了
        var checkAll = this.$selectItem.filter(':enabled').length &&
            this.$selectItem.filter(':enabled').length ===
            this.$selectItem.filter(':enabled').filter(':checked').length;

        // 全选  在initHeader方法中定义
        //this.$selectAll = this.$header.find('[name="btSelectAll"]');
        this.$selectAll.add(this.$selectAll_).prop('checked', checkAll);

        //选中或取消选中，父元素tr会切换不同的类
        this.$selectItem.each(function () {
            $(this).closest('tr')[$(this).prop('checked') ? 'addClass' : 'removeClass']('selected');
        });
    };

    BootstrapTable.prototype.updateRows = function () {
        var that = this;

        this.$selectItem.each(function () {
            that.data[$(this).data('index')][that.header.stateField] = $(this).prop('checked');
        });
    };

    //调用resetRows重置当前页复选框为不选中
    BootstrapTable.prototype.resetRows = function () {
        var that = this;

        $.each(this.data, function (i, row) {
            that.$selectAll.prop('checked', false);
            that.$selectItem.prop('checked', false);
            if (that.header.stateField) {
                row[that.header.stateField] = false;
            }
        });
        this.initHiddenRows();
    };
    // 执行this.options[BootstrapTable.EVENTS[name]]函数(类似浏览器默认事件)，并触发事件
    BootstrapTable.prototype.trigger = function (name) {
        var args = Array.prototype.slice.call(arguments, 1);

        name += '.bs.table';
        //这里的事件绑定分为两类，一种是Option 事件：例如onClickRow，一种是自定义jQuery 事件：例如click-row.bs.table
        this.options[BootstrapTable.EVENTS[name]].apply(this.options, args);
        this.$el.trigger($.Event(name), args);

        this.options.onAll(name, args);
        this.$el.trigger($.Event('all.bs.table'), [name, args]);
    };

    // 一定时间内触发this.fitHeader函数调整表头的水平偏移，垂直滚动不影响表头
    BootstrapTable.prototype.resetHeader = function () {
        // fix #61: the hidden table reset header bug.
        // fix bug: get $el.css('width') error sometime (height = 500)
        clearTimeout(this.timeoutId_);
        this.timeoutId_ = setTimeout($.proxy(this.fitHeader, this), this.$el.is(':hidden') ? 100 : 0);
    };

    // 克隆this.$el中的表头，置入this.$tableHeader中，出使垂直滚动时，表头信息不变  
    // 调整表体水平偏移量和表体水平一致 
    BootstrapTable.prototype.fitHeader = function () {
        
        var that = this,
            fixedBody,
            scrollWidth,
            focused,
            focusedTemp;

        //jQuery的:hidden选择器用于匹配所有不可见的元素，将其封装为jQuery对象并返回
        if (that.$el.is(':hidden')) {
            that.timeoutId_ = setTimeout($.proxy(that.fitHeader, that), 100);
            return;
        }
        //获取.fixed-table-body这个dom元素
        fixedBody = this.$tableBody.get(0);

        // .fixed-table-container有固定高度，其子元素.fixed-table-body超过该高度就显示滚动条
        // scrollWidth: padding+包含内容的完全宽度; 
        // clientWidth: 可视区域不包括滚动条的宽度,padding+height-滚动条; 
        // offsetWidth: 可视区域包括滚动条的宽度,border+padding+height; 
        // outerWidth包括内边距、边框的宽度; 
        // outerWidth(true)包括内边距、边框、外边距的宽度; 
        // innerWidth包括内边距、不包括边框的宽度; 
        // scrollLeft()获取元素的水平偏移，有水平滚动条的情况下; 
        // scrollTop()获取元素的垂直偏移，有垂直滚动条的情况下;

        //scrollWidth应该是我们使用自定义的滚动条时会有一个宽度
        scrollWidth = fixedBody.scrollWidth > fixedBody.clientWidth &&
        fixedBody.scrollHeight > fixedBody.clientHeight + this.$header.outerHeight() ?
            getScrollBarWidth() : 0;
        console.log(scrollWidth)

        //让this.$el里面的表格压到.fixed-table-header元素底下
        this.$el.css('margin-top', -this.$header.outerHeight());

        // 表头聚焦的元素添加focus-temp类，从而使this.$tableHeader的同个元素获得焦点 
        focused = $(':focus');
        if (focused.length > 0) {
            var $th = focused.parents('th');
            if ($th.length > 0) {
                var dataField = $th.attr('data-field');
                if (dataField !== undefined) {
                    var $headerTh = this.$header.find("[data-field='" + dataField + "']");
                    if ($headerTh.length > 0) {
                        $headerTh.find(":input").addClass("focus-temp");
                    }
                }
            }
        }

        //$(selector).clone(true|false) true表示复制事件处理程序
        this.$header_ = this.$header.clone(true, true);
        this.$selectAll_ = this.$header_.find('[name="btSelectAll"]');
        //将表格this.$el及其表头复制到this.$tableHeader里面，并给右边设置一个margin值，这个margin值应该是针对自定义滚动条设置的
        //表格头部右边的空隙是因为被复制的表的宽度加上滚动条的宽度才是UI表格的宽度
        this.$tableHeader.css({
            'margin-right': scrollWidth
        }).find('table').css('width', this.$el.outerWidth())
            .html('').attr('class', this.$el.attr('class'))
            .append(this.$header_);

        focusedTemp = $('.focus-temp:visible:eq(0)');
        if (focusedTemp.length > 0) {
            focusedTemp.focus();
            this.$header.find('.focus-temp').removeClass('focus-temp');
        }

        // fix bug: $.data() is not working as expected after $.append()
        // 将this.$header里面th的data属性复制到clone出来的表头里面
        this.$header.find('th[data-field]').each(function (i) {
            that.$header_.find(sprintf('th[data-field="%s"]', $(this).data('field'))).data($(this).data());
        });

        var visibleFields = this.getVisibleFields(),
            $ths = this.$header_.find('th');

        //this.$body = this.$el.find('>tbody');
        // 标题栏单元格中的.fht-cell元素和表格中元素的宽度相一致
        // 没怎么明白这个是在干什么
        this.$body.find('>tr:first-child:not(.no-records-found) > *').each(function (i) {
            var $this = $(this),
                index = i;

            if (that.options.detailView && !that.options.cardView) {
                if (i === 0) {
                    that.$header_.find('th.detail').find('.fht-cell').width($this.innerWidth());
                }
                index = i - 1;
            }

            var $th = that.$header_.find(sprintf('th[data-field="%s"]', visibleFields[index]));
            if ($th.length > 1) {
                $th = $($ths[$this[0].cellIndex]);
            }

            $th.find('.fht-cell').width($this.innerWidth());
        });

        this.horizontalScroll();
        debugger
        this.trigger('post-header');
    };

    BootstrapTable.prototype.resetFooter = function () {
        var that = this,
            data = that.getData(),
            html = [];

        if (!this.options.showFooter || this.options.cardView) { //do nothing
            return;
        }

        if (!this.options.cardView && this.options.detailView) {
            html.push('<td><div class="th-inner">&nbsp;</div><div class="fht-cell"></div></td>');
        }

        $.each(this.columns, function (i, column) {
            var key,
                falign = '', // footer align style
                valign = '',
                csses = [],
                style = {},
                class_ = sprintf(' class="%s"', column['class']);

            if (!column.visible) {
                return;
            }

            if (that.options.cardView && (!column.cardVisible)) {
                return;
            }

            falign = sprintf('text-align: %s; ', column.falign ? column.falign : column.align);
            valign = sprintf('vertical-align: %s; ', column.valign);

            style = calculateObjectValue(null, that.options.footerStyle);

            if (style && style.css) {
                for (key in style.css) {
                    csses.push(key + ': ' + style.css[key]);
                }
            }

            html.push('<td', class_, sprintf(' style="%s"', falign + valign + csses.concat().join('; ')), '>');
            html.push('<div class="th-inner">');

            html.push(calculateObjectValue(column, column.footerFormatter, [data], '&nbsp;') || '&nbsp;');

            html.push('</div>');
            html.push('<div class="fht-cell"></div>');
            html.push('</div>');
            html.push('</td>');
        });

        this.$tableFooter.find('tr').html(html.join(''));
        this.$tableFooter.show();
        clearTimeout(this.timeoutFooter_);
        this.timeoutFooter_ = setTimeout($.proxy(this.fitFooter, this),
            this.$el.is(':hidden') ? 100 : 0);
    };

    BootstrapTable.prototype.fitFooter = function () {
        var that = this,
            $footerTd,
            elWidth,
            scrollWidth;

        clearTimeout(this.timeoutFooter_);
        if (this.$el.is(':hidden')) {
            this.timeoutFooter_ = setTimeout($.proxy(this.fitFooter, this), 100);
            return;
        }

        elWidth = this.$el.css('width');
        scrollWidth = elWidth > this.$tableBody.width() ? getScrollBarWidth() : 0;

        this.$tableFooter.css({
            'margin-right': scrollWidth
        }).find('table').css('width', elWidth)
            .attr('class', this.$el.attr('class'));

        $footerTd = this.$tableFooter.find('td');

        this.$body.find('>tr:first-child:not(.no-records-found) > *').each(function (i) {
            var $this = $(this);

            $footerTd.eq(i).find('.fht-cell').width($this.innerWidth());
        });

        this.horizontalScroll();
    };

    //加入存在横向滚动，让that.$tableHeader的很像滚动距离和地下的表格的横向滚动距离保持一致
    BootstrapTable.prototype.horizontalScroll = function () {
        var that = this;
        // horizontal scroll event
        // TODO: it's probably better improving the layout than binding to scroll event
        this.$tableBody.off('scroll').on('scroll', function () {
            if (that.options.showHeader && that.options.height) {
              that.$tableHeader.scrollLeft($(this).scrollLeft());
            }

            if (that.options.showFooter && !that.options.cardView) {
                that.$tableFooter.scrollLeft($(this).scrollLeft());
            }
        });
    };

    // toggleColumn筛选条目下拉菜单点选时更新columns[i].visible信息;  
    // this.columns信息的改变，重新调用表头、表体、搜索框、分页初始化函数;  
    // 当勾选的显示条目小于this.options.minimumCountColumns时，勾选的条目设置disabled属性;
    BootstrapTable.prototype.toggleColumn = function (index, checked, needUpdate) {
        if (index === -1) {
            return;
        }
        this.columns[index].visible = checked;
        this.initHeader();
        this.initSearch();
        this.initPagination();
        this.initBody();

        if (this.options.showColumns) {
            var $items = this.$toolbar.find('.keep-open input').prop('disabled', false);

            if (needUpdate) {
                //更新下拉列表里面checkbox的状态
                $items.filter(sprintf('[value="%s"]', index)).prop('checked', checked);
            }

            if ($items.filter(':checked').length <= this.options.minimumCountColumns) {
                $items.filter(':checked').prop('disabled', true);
            }
        }
    };

    // 从this.column中剔除visible为false的项，返回field数组
    BootstrapTable.prototype.getVisibleFields = function () {
        var that = this,
            visibleFields = [];

        $.each(this.header.fields, function (j, field) {
            //that.fieldsColumnsIndex是一个field名称对应列序号的数组
            var column = that.columns[that.fieldsColumnsIndex[field]];

            if (!column.visible) {
                return;
            }
            visibleFields.push(field);
        });
        return visibleFields;
    };

    // PUBLIC FUNCTION DEFINITION
    // =======================

    //调整表体的高度
    BootstrapTable.prototype.resetView = function (params) {
        var padding = 0;

        //传入一个参数，重置表格高度
        if (params && params.height) {
            this.options.height = params.height;
        }

        //设置表格全选按钮的选中状态
        this.$selectAll.prop('checked', this.$selectItem.length > 0 &&
            this.$selectItem.length === this.$selectItem.filter(':checked').length);

        //设置的高度是toolbar，pagination和表格的总高度
        if (this.options.height) {
            var toolbarHeight = this.$toolbar.outerHeight(true),
                paginationHeight = this.$pagination.outerHeight(true),
                height = this.options.height - toolbarHeight - paginationHeight;

            this.$tableContainer.css('height', height + 'px');
        }

        if (this.options.cardView) {
            // remove the element css
            this.$el.css('margin-top', '0');
            this.$tableContainer.css('padding-bottom', '0');
            this.$tableFooter.hide();
            return;
        }

        //showHeader 显示表头，包含标题栏内容
        //this.options.height 默认是undefined，只有设置了this.options.height才会显示.fixed-table-header这个元素
        
        if (this.options.showHeader && this.options.height) {
            this.$tableHeader.show();
            this.resetHeader();
            padding += this.$header.outerHeight();
        } else {
            this.$tableHeader.hide();
            this.trigger('post-header');
        }

        if (this.options.showFooter) {
            this.resetFooter();
            if (this.options.height) {
                padding += this.$tableFooter.outerHeight() + 1;
            }
        }

        // Assign the correct sortable arrow
        this.getCaret();
        this.$tableContainer.css('padding-bottom', padding + 'px');
        this.trigger('reset-view');
    };

    //  过滤或搜索过滤后的数据保存在this.data中，过滤前的数据保存在this.options.data,针对数据在前台的情况;  
    //  有过滤数据，返回过滤数据this.data，无则返回未过滤数据this.options.data;  
    //  前台分页，获取this.pageFrom-1到this.pageTo的data数据或者整个data数据; 
    BootstrapTable.prototype.getData = function (useCurrentPage) {
        var data = this.options.data;
        if (this.searchText || this.options.sortName || !$.isEmptyObject(this.filterColumns) || !$.isEmptyObject(this.filterColumnsPartial)) {
            data = this.data; 
        }

        if (useCurrentPage) { //有前台分页，返回当前页的数据
            return data.slice(this.pageFrom - 1, this.pageTo);
        }

        return data;
    };


    BootstrapTable.prototype.load = function (data) {
        var fixedScroll = false;

        // #431: support pagination
        if (this.options.sidePagination === 'server') {
            //this.options.totalField默认值total
            this.options.totalRows = data[this.options.totalField];
            fixedScroll = data.fixedScroll;
            //dataField：后台传回data数据的字段名，默认值是rows
            data = data[this.options.dataField];
        } else if (!$.isArray(data)) { // support fixedScroll
            fixedScroll = data.fixedScroll;
            data = data.data;
        }

        this.initData(data);
        this.initSearch();
        this.initPagination();
        this.initBody(fixedScroll); //fixedScroll为false，load完以后自动表格滚动到顶部
    };

    BootstrapTable.prototype.append = function (data) {
        this.initData(data, 'append');
        this.initSearch();
        this.initPagination();
        this.initSort();
        this.initBody(true);
    };

    BootstrapTable.prototype.prepend = function (data) {
        this.initData(data, 'prepend');
        this.initSearch();
        this.initPagination();
        this.initSort();
        this.initBody(true);
    };

    BootstrapTable.prototype.remove = function (params) {
        //params： 对象，包含两个属性： field: 需要删除的行的 field 名称。values: field值数组，值包含在这个数组里面的表格行就会被删掉
        var len = this.options.data.length,
            i, row;

        if (!params.hasOwnProperty('field') || !params.hasOwnProperty('values')) {
            return;
        }

        for (i = len - 1; i >= 0; i--) {
            row = this.options.data[i];

            if (!row.hasOwnProperty(params.field)) {
                continue;
            }

            if ($.inArray(row[params.field], params.values) !== -1) {
                this.options.data.splice(i, 1);
                if (this.options.sidePagination === 'server') {
                    this.options.totalRows -= 1;
                }
            }
        }

        //如果一条数据都没有删掉，直接返回，不进行后续操作
        if (len === this.options.data.length) {
            return;
        }

        this.initSearch();
        this.initPagination();
        this.initSort();
        this.initBody(true);
    };

    BootstrapTable.prototype.removeAll = function () {
        if (this.options.data.length > 0) {
            this.options.data.splice(0, this.options.data.length);
            this.initSearch();
            this.initPagination();
            this.initBody(true);
        }
    };

    //根据 uniqueId 获取行数据
    // 获取row[options.uniqueId]或者row._data[options.uniqueId]同id相等的某一行数据
    BootstrapTable.prototype.getRowByUniqueId = function (id) {
        var uniqueId = this.options.uniqueId,
            len = this.options.data.length,
            dataRow = null,
            i, row, rowUniqueId;

        for (i = len - 1; i >= 0; i--) {
            row = this.options.data[i];

            if (row.hasOwnProperty(uniqueId)) { // uniqueId is a column
                rowUniqueId = row[uniqueId];
            } else if(row._data.hasOwnProperty(uniqueId)) { // uniqueId is a row data property
                rowUniqueId = row._data[uniqueId];
            } else {
                continue;
            }

            if (typeof rowUniqueId === 'string') {
                id = id.toString();
            } else if (typeof rowUniqueId === 'number') {
                //区分小数和整数
                if ((Number(rowUniqueId) === rowUniqueId) && (rowUniqueId % 1 === 0)) {
                    id = parseInt(id);
                } else if ((rowUniqueId === Number(rowUniqueId)) && (rowUniqueId !== 0)) {
                    id = parseFloat(id);
                }
            }

            if (rowUniqueId === id) {
                dataRow = row;
                break;
            }
        }

        return dataRow;
    };

    BootstrapTable.prototype.removeByUniqueId = function (id) {
        var len = this.options.data.length,
            row = this.getRowByUniqueId(id);

        if (row) {
            this.options.data.splice(this.options.data.indexOf(row), 1);
        }

        if (len === this.options.data.length) {
            return;
        }

        this.initSearch();
        this.initPagination();
        this.initBody(true);
    };

    // 更新替换某一行数据，参数params格式为{id:row[options.uniqueId],row:row替换数据} 或者 [{id:row[options.uniqueId],row:row替换数据},{id:row[options.uniqueId],row:row替换数据}]
    BootstrapTable.prototype.updateByUniqueId = function (params) {
        var that = this;
        //allParams是个数组说明，可以批量修改
        var allParams = $.isArray(params) ? params : [ params ];

        $.each(allParams, function(i, params) {
            var rowId;

            if (!params.hasOwnProperty('id') || !params.hasOwnProperty('row')) {
                return;
            }

            //获取序号
            rowId = $.inArray(that.getRowByUniqueId(params.id), that.options.data);

            if (rowId === -1) {
                return;
            }
            //利用$.extend合并对象的方式来修改数组
            $.extend(that.options.data[rowId], params.row);
        });

        this.initSearch();
        this.initPagination();
        this.initSort();
        this.initBody(true);
    };

    //这个方法在合并单元格时调用
    BootstrapTable.prototype.refreshColumnTitle = function (params) {
        if (!params.hasOwnProperty('field') || !params.hasOwnProperty('title')) {
            return;
        }

        this.columns[this.fieldsColumnsIndex[params.field]].title = this.options.escape 
                                                                    ? escapeHTML(params.title) 
                                                                    : params.title;
        
        if (this.columns[this.fieldsColumnsIndex[params.field]].visible) {
            var header = this.options.height !== undefined ? this.$tableHeader : this.$header; 
            header.find('th[data-field]').each(function (i) {
                if ($(this).data('field') === params.field) {
                    $($(this).find(".th-inner")[0]).text(params.title);
                    return false;
                }
            });
        }
    };

    // 在某一行后插入数据，参数params格式为{index:index行号,row:row插入数据内容}
    BootstrapTable.prototype.insertRow = function (params) {
        if (!params.hasOwnProperty('index') || !params.hasOwnProperty('row')) {
            return;
        }
        this.options.data.splice(params.index, 0, params.row);
        this.initSearch();
        this.initPagination();
        this.initSort();
        this.initBody(true);
    };
    // 更新替换某一行数据，参数params格式为{index:index行号,row:row替换数据} 或者 [{index:index行号,row:row替换数据},{index:index行号,row:row替换数据}]
    BootstrapTable.prototype.updateRow = function (params) {
        var that = this;
        var allParams = $.isArray(params) ? params : [ params ];

        $.each(allParams, function(i, params) {
            if (!params.hasOwnProperty('index') || !params.hasOwnProperty('row')) {
                return;
            }
            $.extend(that.options.data[params.index], params.row);
        });

        this.initSearch();
        this.initPagination();
        this.initSort();
        this.initBody(true);
    };

    BootstrapTable.prototype.initHiddenRows = function () {
        this.hiddenRows = [];
    };

    // 根据{[index:index],[uniqueid:uniqueId]}找到某一行，显示
    // params.index: 数组，要更新的行的 index 或者 uniqueId。
    // params.isIdField: 指定 index 是否为 uniqueid
    BootstrapTable.prototype.showRow = function (params) {
        this.toggleRow(params, true);
    };

    BootstrapTable.prototype.hideRow = function (params) {
        this.toggleRow(params, false);
    };

    BootstrapTable.prototype.toggleRow = function (params, visible) {
        var row, index;
        //获取数据的方式有两种，根据index索引或者uniqueId值
        if (params.hasOwnProperty('index')) {
            row = this.getData()[params.index];
        } else if (params.hasOwnProperty('uniqueId')) {
            row = this.getRowByUniqueId(params.uniqueId);
        }

        if (!row) {
            return;
        }

        index = $.inArray(row, this.hiddenRows);

        if (!visible && index === -1) {
            this.hiddenRows.push(row);
        } else if (visible && index > -1) {
            this.hiddenRows.splice(index, 1);
        }
        this.initBody(true);
    };

    BootstrapTable.prototype.getHiddenRows = function (show) {
        var that = this,
            data = this.getData(),
            rows = [];

        $.each(data, function (i, row) {
            if ($.inArray(row, that.hiddenRows) > -1) {
                rows.push(row);
            }
        });
        this.hiddenRows = rows;
        return rows;
    };

    // 合并单元格，传参为{index:index.field:field,rowspan:3,colspan:4}  
    // 隐藏被合并单元格，重新设置显示单元格rowspan、colspan属性
    // options
    /**
     * [mergeCells description]
     * @param  {[type]} options 
     *         options.index: the row index. 
               options.field: the field name.
               options.rowspan: the rowspan count to be merged. 
               options.colspan: the colspan count to be merged.
     * @return {[type]}         [description]
     */
    BootstrapTable.prototype.mergeCells = function (options) {
        var row = options.index,
            col = $.inArray(options.field, this.getVisibleFields()),
            rowspan = options.rowspan || 1,
            colspan = options.colspan || 1,
            i, j,
            $tr = this.$body.find('>tr'),
            $td;

        if (this.options.detailView && !this.options.cardView) {
            col += 1;
        }

        $td = $tr.eq(row).find('>td').eq(col);

        //处理一些极端情况
        if (row < 0 || col < 0 || row >= this.data.length) {
            return;
        }

        for (i = row; i < row + rowspan; i++) {
            for (j = col; j < col + colspan; j++) {
                $tr.eq(i).find('>td').eq(j).hide();
            }
        }

        $td.attr('rowspan', rowspan).attr('colspan', colspan).show();
    };
    /**
     * [updateCell description]
     * @param  {[type]} params [description]
     * index: the row index. 
     * field: the field name.
     * value: the new field value.
     * @return {[type]}        [description]
     */
    BootstrapTable.prototype.updateCell = function (params) {
        if (!params.hasOwnProperty('index') ||
            !params.hasOwnProperty('field') ||
            !params.hasOwnProperty('value')) {
            return;
        }
        this.data[params.index][params.field] = params.value;


        if (params.reinit === false) {
            return;
        }
        this.initSort();
        this.initBody(true);
    };
    
    BootstrapTable.prototype.getOptions = function () {
        //Deep copy
        return $.extend(true, {}, this.options);
    };
    // 通过过滤后的数据this.data返回选中行的数据
    BootstrapTable.prototype.getSelections = function () {
        var that = this;

        return $.grep(this.options.data, function (row) {
            // fix #2424: from html with checkbox
            // stateField是radio或者checkbox
            return row[that.header.stateField] === true;
        });
    };
    // 通过未过滤的数据this.options.data返回选中行的数据
    BootstrapTable.prototype.getAllSelections = function () {
        var that = this;

        return $.grep(this.options.data, function (row) {
            return row[that.header.stateField];
        });
    };
    // 执行全选
    BootstrapTable.prototype.checkAll = function () {
        this.checkAll_(true);
    };
    // 执行全不选 
    BootstrapTable.prototype.uncheckAll = function () {
        this.checkAll_(false);
    };
    // 反选，调用updateRows执行initSort、initBody，调用updateSelect为行元素tr添加selected类
    BootstrapTable.prototype.checkInvert = function () {
        var that = this;
        var rows = that.$selectItem.filter(':enabled');
        var checked = rows.filter(':checked');
        rows.each(function() {
            $(this).prop('checked', !$(this).prop('checked'));
        });
        that.updateRows();
        that.updateSelected();
        that.trigger('uncheck-some', checked);
        checked = that.getSelections();
        that.trigger('check-some', checked);
    };

    BootstrapTable.prototype.checkAll_ = function (checked) {
        var rows;
        if (!checked) {
            rows = this.getSelections();
        }
        this.$selectAll.add(this.$selectAll_).prop('checked', checked);
        this.$selectItem.filter(':enabled').prop('checked', checked);
        this.updateRows();
        if (checked) {
            rows = this.getSelections();
        }
        this.trigger(checked ? 'check-all' : 'uncheck-all', rows);
    };
    // 选中
    BootstrapTable.prototype.check = function (index) {
        this.check_(true, index);
    };
    // 取消选中
    BootstrapTable.prototype.uncheck = function (index) {
        this.check_(false, index);
    };

    BootstrapTable.prototype.check_ = function (checked, index) {
        var $el = this.$selectItem.filter(sprintf('[data-index="%s"]', index)).prop('checked', checked);
        this.data[index][this.header.stateField] = checked;
        this.updateSelected();
        this.trigger(checked ? 'check' : 'uncheck', this.data[index], $el);
    };
    // 选中某几行数据
    BootstrapTable.prototype.checkBy = function (obj) {
        this.checkBy_(true, obj);
    };
    // 取消选中某几行数据
    BootstrapTable.prototype.uncheckBy = function (obj) {
        this.checkBy_(false, obj);
    };
    // 根据条件选中、取消选中某几行数据执行函数，obj参数格式为{field:paramName,values:paramValues}
    // obj.field应该是字符串，obj.values应该是个数组
    BootstrapTable.prototype.checkBy_ = function (checked, obj) {
        if (!obj.hasOwnProperty('field') || !obj.hasOwnProperty('values')) {
            return;
        }

        var that = this,
            rows = [];
        $.each(this.options.data, function (index, row) {
            if (!row.hasOwnProperty(obj.field)) {
                return false;
            }
            if ($.inArray(row[obj.field], obj.values) !== -1) {
                var $el = that.$selectItem.filter(':enabled')
                    .filter(sprintf('[data-index="%s"]', index)).prop('checked', checked);
                row[that.header.stateField] = checked;
                rows.push(row);
                that.trigger(checked ? 'check' : 'uncheck', row, $el);
            }
        });
        this.updateSelected();
        this.trigger(checked ? 'check-some' : 'uncheck-some', rows);
    };
    // 移出触发元素，其内容、样式通过this.$el_改为初始值，移除构造函数添加最外层包裹元素this.$container
    BootstrapTable.prototype.destroy = function () {
        this.$el.insertBefore(this.$container);
        $(this.options.toolbar).insertBefore(this.$el);
        this.$container.next().remove();
        this.$container.remove();
        this.$el.html(this.$el_.html())
            .css('margin-top', '0')
            .attr('class', this.$el_.attr('class') || ''); // reset the class
    };

    BootstrapTable.prototype.showLoading = function () {
        this.$tableLoading.show();
    };

    BootstrapTable.prototype.hideLoading = function () {
        this.$tableLoading.hide();
    };

    //显示隐藏翻页条
    BootstrapTable.prototype.togglePagination = function () {
        this.options.pagination = !this.options.pagination;
        var button = this.$toolbar.find('button[name="paginationSwitch"] i');
        if (this.options.pagination) {
            button.attr("class", this.options.iconsPrefix + " " + this.options.icons.paginationSwitchDown);
        } else {
            button.attr("class", this.options.iconsPrefix + " " + this.options.icons.paginationSwitchUp);
        }
        this.updatePagination();
    };

    // 刷新页面到第一页，传入参数为{url:url,slient:slient,query:query}
    // {silent: true} to refresh the data silently
    BootstrapTable.prototype.refresh = function (params) {
        if (params && params.url) {
            this.options.url = params.url;
        }
        if (params && params.pageNumber) {
            this.options.pageNumber = params.pageNumber;
        }
        if (params && params.pageSize) {
            this.options.pageSize = params.pageSize;
        }
        this.initServer(params && params.silent,
            params && params.query, params && params.url);
        this.trigger('refresh', params);
    };

    BootstrapTable.prototype.resetWidth = function () {
        if (this.options.showHeader && this.options.height) {
            this.fitHeader();
        }
        if (this.options.showFooter && !that.options.cardView) {
            this.fitFooter();
        }
    };
    // 根据field属性获得fieldIndex，再调用toggleColumn显示某列
    BootstrapTable.prototype.showColumn = function (field) {
        this.toggleColumn(this.fieldsColumnsIndex[field], true, true);
    };
    // 根据field属性获得fieldIndex，再调用toggleColumn隐藏某列 
    BootstrapTable.prototype.hideColumn = function (field) {
        this.toggleColumn(this.fieldsColumnsIndex[field], false, true);
    };

    BootstrapTable.prototype.getHiddenColumns = function () {
        return $.grep(this.columns, function (column) {
            return !column.visible;
        });
    };

    BootstrapTable.prototype.getVisibleColumns = function () {
        return $.grep(this.columns, function (column) {
            return column.visible;
        });
    };

    BootstrapTable.prototype.toggleAllColumns = function (visible) {
        var that = this;
        $.each(this.columns, function (i, column) {
            that.columns[i].visible = visible;
        });

        this.initHeader();
        this.initSearch();
        this.initPagination();
        this.initBody();
        if (this.options.showColumns) {
            var $items = this.$toolbar.find('.keep-open input').prop('disabled', false);

            if ($items.filter(':checked').length <= this.options.minimumCountColumns) {
                $items.filter(':checked').prop('disabled', true);
            }
        }
    };
    //显示所有列
    BootstrapTable.prototype.showAllColumns = function () {
        this.toggleAllColumns(true);
    };
    //隐藏所有列
    BootstrapTable.prototype.hideAllColumns = function () {
        this.toggleAllColumns(false);
    };
    /*
     *     设置过滤数组this.filterColumns; 
     *     options.data和this.filterColumns相符则在this.data中保留，不相符则在this.data中删除; 
     *     设置页码为1，重新调用initSearch、updatePagination渲染表格; 
     *     （只能用于 client 端）过滤表格数据， 你可以通过过滤{age: 10}来显示 age 等于 10 的数据。
     */
    BootstrapTable.prototype.filterBy = function (columns) {
        this.filterColumns = $.isEmptyObject(columns) ? {} : columns;
        this.options.pageNumber = 1;
        this.initSearch();
        this.updatePagination();
    };

    BootstrapTable.prototype.scrollTo = function (value) {
        if (typeof value === 'string') {
            value = value === 'bottom' ? this.$tableBody[0].scrollHeight : 0;
        }
        if (typeof value === 'number') {
            this.$tableBody.scrollTop(value);
        }
        if (typeof value === 'undefined') {
            //不传入参数时就获取当前滚动距离
            return this.$tableBody.scrollTop();
        }
    };

    BootstrapTable.prototype.getScrollPosition = function () {
        return this.scrollTo();
    };

    BootstrapTable.prototype.selectPage = function (page) {
        if (page > 0 && page <= this.options.totalPages) {
            this.options.pageNumber = page;
            this.updatePagination();
        }
    };

    BootstrapTable.prototype.prevPage = function () {
        if (this.options.pageNumber > 1) {
            this.options.pageNumber--;
            this.updatePagination();
        }
    };

    BootstrapTable.prototype.nextPage = function () {
        if (this.options.pageNumber < this.options.totalPages) {
            this.options.pageNumber++;
            this.updatePagination();
        }
    };

    // 切换卡片式显示或者表格详情显示
    BootstrapTable.prototype.toggleView = function () {
        this.options.cardView = !this.options.cardView;
        this.initHeader();
        // Fixed remove toolbar when click cardView button.
        //that.initToolbar();
        this.initBody();
        this.trigger('toggle', this.options.cardView);
    };

    BootstrapTable.prototype.refreshOptions = function (options) {
        //If the objects are equivalent then avoid the call of destroy / init methods
        //比较两个对象是否拥有相同的属性和属性值
        if (compareObjects(this.options, options, true)) {
            return;
        }
        this.options = $.extend(this.options, options);
        this.trigger('refresh-options', this.options);
        this.destroy();
        this.init();
    };

    BootstrapTable.prototype.resetSearch = function (text) {
        var $search = this.$toolbar.find('.search input');
        $search.val(text || '');
        this.onSearch({currentTarget: $search});
    };
    // 表格详情显示时，折叠展开按钮执行函数
    BootstrapTable.prototype.expandRow_ = function (expand, index) {
        var $tr = this.$body.find(sprintf('> tr[data-index="%s"]', index));
        if ($tr.next().is('tr.detail-view') === (expand ? false : true)) {
            $tr.find('> td > .detail-icon').click();
        }
    };

    BootstrapTable.prototype.expandRow = function (index) {
        this.expandRow_(true, index);
    };

    BootstrapTable.prototype.collapseRow = function (index) {
        this.expandRow_(false, index);
    };

    // expandAllRows展开所有卡片式详情，在表格显示的时候  
    // isSubTable为真，展开父子表格的详情
    BootstrapTable.prototype.expandAllRows = function (isSubTable) {
        if (isSubTable) {
            var $tr = this.$body.find(sprintf('> tr[data-index="%s"]', 0)),
                that = this,
                detailIcon = null,
                executeInterval = false,
                idInterval = -1;

            if (!$tr.next().is('tr.detail-view')) {
                $tr.find('> td > .detail-icon').click();
                executeInterval = true;
            } else if (!$tr.next().next().is('tr.detail-view')) {
                $tr.next().find(".detail-icon").click();
                executeInterval = true;
            }

            if (executeInterval) {
                try {
                    idInterval = setInterval(function () {
                        detailIcon = that.$body.find("tr.detail-view").last().find(".detail-icon");
                        if (detailIcon.length > 0) {
                            detailIcon.click();
                        } else {
                            clearInterval(idInterval);
                        }
                    }, 1);
                } catch (ex) {
                    clearInterval(idInterval);
                }
            }
        } else {
            var trs = this.$body.children();
            for (var i = 0; i < trs.length; i++) {
                this.expandRow_(true, $(trs[i]).data("index"));
            }
        }
    };

    BootstrapTable.prototype.collapseAllRows = function (isSubTable) {
        if (isSubTable) {
            this.expandRow_(false, 0);
        } else {
            var trs = this.$body.children();
            for (var i = 0; i < trs.length; i++) {
                this.expandRow_(false, $(trs[i]).data("index"));
            }
        }
    };
    // 更新配置项中的格式化函数
    BootstrapTable.prototype.updateFormatText = function (name, text) {
        //text是字符串，formatter就返回该字符串，text是函数就替换原来的函数
        if (this.options[sprintf('format%s', name)]) {
            if (typeof text === 'string') {
                this.options[sprintf('format%s', name)] = function () {
                    return text;
                };
            } else if (typeof text === 'function') {
                this.options[sprintf('format%s', name)] = text;
            }
        }
        this.initToolbar();
        this.initPagination();
        this.initBody();
    };

    // BOOTSTRAP TABLE PLUGIN DEFINITION
    // =======================

    var allowedMethods = [
        'getOptions',
        'getSelections', 'getAllSelections', 'getData',
        'load', 'append', 'prepend', 'remove', 'removeAll',
        'insertRow', 'updateRow', 'updateCell', 'updateByUniqueId', 'removeByUniqueId',
        'getRowByUniqueId', 'showRow', 'hideRow', 'getHiddenRows',
        'mergeCells', 'refreshColumnTitle',
        'checkAll', 'uncheckAll', 'checkInvert',
        'check', 'uncheck',
        'checkBy', 'uncheckBy',
        'refresh',
        'resetView',
        'resetWidth',
        'destroy',
        'showLoading', 'hideLoading',
        'showColumn', 'hideColumn', 'getHiddenColumns', 'getVisibleColumns',
        'showAllColumns', 'hideAllColumns',
        'filterBy',
        'scrollTo',
        'getScrollPosition',
        'selectPage', 'prevPage', 'nextPage',
        'togglePagination',
        'toggleView',
        'refreshOptions',
        'resetSearch',
        'expandRow', 'collapseRow', 'expandAllRows', 'collapseAllRows',
        'updateFormatText'
    ];

    $.fn.bootstrapTable = function (option) {
        var value,
            //args是arguments剔除第一个参数以后的结果
            args = Array.prototype.slice.call(arguments, 1);

        this.each(function () {
            var $this = $(this),
                data = $this.data('bootstrap.table'),
                // 配置项在触发元素的data数据中，或在js的option传参中
                options = $.extend({}, BootstrapTable.DEFAULTS, $this.data(),
                    typeof option === 'object' && option);
            //说明是调用方法
            if (typeof option === 'string') {
                //这里面option是方法名
                if ($.inArray(option, allowedMethods) < 0) {
                    throw new Error("Unknown method: " + option);
                }
                //初始化过的组件data是有值的
                if (!data) {
                    return;
                }

                value = data[option].apply(data, args);

                //destory组件要清除初始化状态
                if (option === 'destroy') {
                    $this.removeData('bootstrap.table');
                }
            }

            if (!data) {
                $this.data('bootstrap.table', (data = new BootstrapTable(this, options)));
            }
        });

        //value不存在说明是组件初始化
        return typeof value === 'undefined' ? this : value;
    };

    $.fn.bootstrapTable.Constructor = BootstrapTable;
    $.fn.bootstrapTable.defaults = BootstrapTable.DEFAULTS;
    $.fn.bootstrapTable.columnDefaults = BootstrapTable.COLUMN_DEFAULTS;
    $.fn.bootstrapTable.locales = BootstrapTable.LOCALES;
    $.fn.bootstrapTable.methods = allowedMethods;
    $.fn.bootstrapTable.utils = {
        sprintf: sprintf,
        compareObjects: compareObjects,
        calculateObjectValue: calculateObjectValue,
        getItemField: getItemField,
        objectKeys: objectKeys,
        isIEBrowser: isIEBrowser
    };

    // BOOTSTRAP TABLE INIT
    // =======================

    $(function () {
        $('[data-toggle="table"]').bootstrapTable();
    });
})(jQuery);
