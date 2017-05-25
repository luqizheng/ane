import * as avalon from 'avalon2';
import * as moment from 'moment';
import controlComponent from '../ms-form/ms-control';
import '../ms-trigger';
import '../ms-calendar';
import { emitToFormItem } from '../ms-form/utils';

/**
 * 日期选择组件
 * @prop value 组件值(inherit)
 * @prop col 字段路径(inherit)
 * @prop format 日期格式，参考 momentjs
 * @prop startDate 控制可已选择的时间的开始日期，日期字符串，格式与 format 参数匹配，设置此项自动忽略 disabledDate
 * @prop endDate 控制可已选择的时间的结束日期，日期字符串，格式与 format 参数匹配，设置此项自动忽略 disabledDate
 * @prop disabledDate 不可选择日期的判断函数，传入 current（当前遍历日期），返回 true 表示此日期不可选
 * 
 * @example
 * ``` html
 * 
 * ```
 */
controlComponent.extend({
    displayName: 'ms-datepicker',
    template: __inline('./ms-datepicker.html'),
    defaults: {
        selected: '',
        format: 'YYYY-MM-DD',
        startDate: '',
        endDate: '',
        disabledDate() { return false; },
        withInBox(el) {
            return this.$element === el || avalon.contains(this.$element, el);
        },
        getTarget() {
            return this.$element;
        },
        handleClick(e) {
            if (!this.panelVisible) {
                avalon.vmodels[this.panelVmId].reset();
                this.panelVisible = true;
            } else {
                this.panelVisible = false;
            }
        },

        panelVmId: '',
        panelVisible: false,
        panelClass: 'ane-datepicker-panel-container',
        panelTemplate: __inline('./ms-datepicker-panel.html'),
        handlePanelHide() {
            this.panelVisible = false;
        },

        mapValueToSelected(value) {
            this.selected = value;
        },
        onInit: function (event) {
            const self = this;
            emitToFormItem(this);
            this.$watch('value', v => {
                this.mapValueToSelected(v);
                this.handleChange({
                    target: { value: v },
                    denyValidate: true,
                    type: 'changed'
                });
            });
            this.panelVmId = this.$id + '_panel';
            const innerVm = avalon.define({
                $id: this.panelVmId,
                currentDateArray: [],
                $moment: moment(),
                currentMonth: '',
                currentYear: 0,
                $startDate: null,
                $endDate: null,
                disabledDate() { return false; },
                // 0-月视图，1-年视图，2-十年视图，3-百年视图
                viewMode: 0,
                staged: 0,
                $computed: {
                    startOfDecade() {
                        return this.currentYear - this.currentYear % 10;
                    },
                    startOfCentury() {
                        return this.currentYear - this.currentYear % 100;
                    },
                },
                reset() {
                    this.viewMode = 0;
                    this.staged = 0;
                    this.$moment = self.selected ? moment(self.selected, self.format) : moment();
                    this.currentMonth = this.$moment.format('MMM');
                    this.currentYear = this.$moment.year();
                    this.currentDateArray = this.$moment.toArray();
                    
                    // 构造不可选择日期的判断函数
                    if (self.startDate) {
                        this.$startDate = moment(self.startDate, self.format);
                    }
                    if (self.endDate) {
                        this.$endDate = moment(self.endDate, self.format);
                    }
                    if (self.startDate || self.endDate) {
                        // 如果设置了开始日期和结束日期，则据此构造一个判断函数
                        this.disabledDate = (current) => {
                            if (this.$startDate === null && this.$endDate === null) {
                                return false;
                            }
                            const currentMoment = moment(current);
                            const isSameOrAfterStartDate = currentMoment.isSameOrAfter(this.$startDate, 'date');
                            const isSameOrBeforeEndDate = currentMoment.isSameOrBefore(this.$endDate, 'date');
                            if (this.$startDate === null) {
                                return !isSameOrBeforeEndDate;
                            }
                            if (this.$endDate === null) {
                                return !isSameOrAfterStartDate;
                            }
                            return !(isSameOrAfterStartDate && isSameOrBeforeEndDate);
                        };
                    } else {
                        // 否则使用默认的或者外部传进来的判断函数
                        this.disabledDate = self.disabledDate;
                    }
                },
                changeView(viewMode) {
                    if (this.viewMode === 0 && viewMode === 2) {
                        // 从月视图直接跳到十年视图后，返回时跳过年视图
                        this.staged = 1;
                    }
                    this.viewMode = viewMode;
                },
                handleYearViewSelect(el) {
                    if (this.viewMode === 1) {
                        this.currentMonth = el.value;
                        this.$moment.month(el.value);
                        this.currentDateArray = this.$moment.toArray();
                    }
                    if (this.viewMode === 3) {
                        this.currentYear = el.value;
                        this.$moment.year(el.value);
                        this.currentDateArray = this.$moment.toArray();
                    }
                    if (this.viewMode === 2) {
                        this.currentYear = el.value;
                        this.$moment.year(el.value);
                        this.currentDateArray = this.$moment.toArray();
                        this.viewMode = this.viewMode - 1 - this.staged;
                        this.staged = 0;
                    } else {
                        this.viewMode = this.viewMode - 1;
                    }
                },
                mutate(action, ...args) {
                    this.$moment[action].apply(this.$moment, args);
                    this.currentMonth = this.$moment.format('MMM');
                    this.currentYear = this.$moment.year();
                    this.currentDateArray = this.$moment.toArray();
                },
                handleCalendarChange(e) {
                    this.$moment = e.target.value;
                    self.selected = this.$moment.format(self.format);
                    self.panelVisible = false;
                    self.handleChange({
                        target: { value: self.selected },
                        type: 'datepicker-changed'
                    });
                }
            });
            innerVm.reset();

            this.mapValueToSelected(this.value);
        },
        onDispose() {
            delete avalon.vmodels[this.panelVmId];
        }
    }
});