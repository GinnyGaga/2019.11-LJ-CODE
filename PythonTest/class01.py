# ================================ 必须要掌握的 ==========================

# 类
# 普通的变量
a = [1,2,3]
b = 1
c = True

# 普通办法
def ccc():
    print("12312312")

# 类包含了属性（特征）和方法（行为，能干啥）
# 类名首字母大写
class Person():
    # 成员变量，无论哪一个地方都能用成员变量
    nl = 48
    sg = 178
    xb = "男"
    mz = "李勃雨"

    # 成员方法：已self参数开头的方法
    # 类本身的实例化对象
    def chang(self):
        print("大家好，我是长达两年半的实习生，我会唱")
        print("还有跳")
        print("还有rap")
        print("还有篮球")

    # 成员方法的传参
    def tiao(self, wd):             # wd = "广场舞"
        print("我会跳{}".format(wd))

    # self的用法
    # self和实例化对象一样，self在类里面用；实例化对象在类外面
    def rap(self):
        a = self.mz         # 引用类的属性
        print(a)
        self.chang()        # 引用类的成员方法

# 实例化类：p是Person的实例化对象
# 引用类，不要放到类里面去
d = Person()        # 赋值语句
# print(d.mz)         # 引用类的成员变量
# d.chang()           # 引用类的成员方法
# d.tiao("广场舞")     # 成员方法的传参

d.rap()         # self在类里面引用变量和方法
