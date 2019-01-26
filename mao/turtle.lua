turtle.refuel()
print("Refueled turtle!")
while turtle.detect() do
    print('DIG THE FUCK OUT OF THIS STONE')
    if turtle.detectUp() then
        turtle.digUp()
    end
    turtle.dig()
    turtle.forward()
end