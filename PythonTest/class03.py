# ========== 能掌握就掌握，不能掌握就算了
# 类的继承

# 类和类之间的关系：继承，儿子继承父亲的遗产；
# 重写：子类去覆盖父类的属性和方法

class DongWu():
    tz = 100
    def run(self):
        print("动物能跑！")

class Ren(DongWu):
    pass                # 占坑，语法不会报错，啥也不是
    tz = 200
    def run(self):
        print("人能跑！")

r = Ren()           # 实例化的是人，但是人继承了动物的属性和方法
print(r.tz)         # 子类去调用父类的属性
r.run()             # 子类去调用父类的方法


