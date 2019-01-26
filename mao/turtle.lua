turtle.refuel()
print("Refueled turtle!")
while turtle.detect() do
    print('DIG THE HECK OUT OF THIS STONE')
    if turtle.detectUp() then
        turtle.digUp()
    end
    turtle.dig()
    turtle.forward()
end