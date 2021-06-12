const Configuration = {
    PIXELS_PER_UNIT_LENGTH: 10,
    FORCE_CONSTANT: 25000,
    SLEEP_TIME: 22,
    TIME_STEP: 0.1,
    MINIMUM_PARTICLE_charge: 10,
    MAXIMUM_PARTICLE_charge: 30,
    MAXIMUM_INITIAL_VELOCITY: 1,
    DEFAULT_NUMBER_OF_PARTICLES: 10
};
 
class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Vector(this.x + other.x, this.y + other.y)
    }

    subtract(other) {
        return new Vector(other.x - this.x, other.y - this.y);
    }

    multiply(factor) {
        return new Vector(this.x * factor, this.y * factor);
    }

    get magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
}

class Particle {
    constructor(charge, radius, color) {
        this.charge = charge;
        this.radius = radius;
        this.color = color;
        this.position = new Vector(0, 0);
        this.velocity = new Vector(0, 0);
    }

    getDistance(other) {
        return this.position.subtract(other.position).magnitude;
    }

    getForceVector(other) {
        // A particle exerts no force on itself.
        if (this == other) return new Vector(0, 0);


        let length = Configuration.FORCE_CONSTANT * this.charge * other.charge / this.getDistance(other) ** 2;
        let angle = Math.atan2(this.position.y - other.position.y, this.position.x - other.position.x);
        let xComponent = length * Math.cos(angle);
        let yComponent = length * Math.sin(angle);
        return new Vector(xComponent, yComponent);
    }

    getKineticEnergy() {
        return 0.5 * this.charge * this.velocity.magnitude ** 2;
    }

    getPotentialEnergy(other) {
        return Configuration.FORCE_CONSTANT * this.charge * other.charge / this.getDistance(other);
    }

    render(context) {
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(
            this.position.x, this.position.y, // Position
            Configuration.PIXELS_PER_UNIT_LENGTH * this.radius, // Radius
            0, Math.PI * 2 // Degrees
        );
        context.fill();
    }
}

class SimulationEngine {
    constructor(canvas, particles, timeStep, sleepTime, mouseCursor) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.particles = particles;
        this.timeStep = timeStep;
        this.sleepTime = sleepTime;
        this.intervalId = null;
        this.mouseCursor = mouseCursor;
    }

    start() {
        this.totalEnergy = this.computeTotalEnergy();
        this.intervalId = setInterval(() => {
            this.step();
            this.render();
        }, this.sleepTime)
    }

    stop() {
        clearInterval(this.intervalId);
    }

    step() {
        // this.computePlayerForceVectors();
        this.updatePlayerVelocities(this.computePlayerForceVectors());
        this.updateParticleVelocities(this.computeForceVectors());
        this.moveParticles();
        this.resolveBorderCollisions();
        this.normalizeVelocityVectors();
    }

    computeForceVectors() {
        return this.particles.map(particle => {
            let vector = this.particles.reduce(
                (vector, other) => {
                    // console.log(this.mouseCursor)
                    return vector.add(particle.getForceVector(other));
                },
                new Vector(0, 0)
            );
            // console.log(particle)
            return [particle, vector];
            
        });
    }

    computePlayerForceVectors() {
        let vector = Array.from(this.mouseCursor).reduce(
            (vector, other) => {
                return vector.add(this.mouseCursor.getForceVector(other));
            },
            new Vector(0, 0)
        );
        // console.log(this.mouseCursor)
        return Array.from([this.mouseCursor, vector]);
    }

    updateParticleVelocities(particleVectorMap) {
        // console.log(particleVectorMap)
        particleVectorMap.forEach(([particle, vector]) => {
            vector = vector.multiply(1 / particle.charge);
            particle.velocity.x += vector.x * this.timeStep;
            particle.velocity.y += vector.y * this.timeStep;
        });
    }

    updatePlayerVelocities(particleVectorMap) {
        // console.log(particleVectorMap)
        // particleVectorMap.forEach(([particle, vector]) => {
        //     vector = vector.multiply(1 / particle.charge);
        //     particle.velocity.x += vector.x * this.timeStep;
        //     particle.velocity.y += vector.y * this.timeStep;
        // });
    }

    moveParticles() {
        
        this.particles.forEach(particle => {
            this.mouseCursor.velocity.x = 0;
            this.mouseCursor.velocity.y = 0;
            particle.position.x += particle.velocity.x * this.timeStep;
            particle.position.y += particle.velocity.y * this.timeStep;
            
        });
    }

    resolveBorderCollisions() {
        this.particles.forEach(particle => {
            let radius = particle.radius * Configuration.PIXELS_PER_UNIT_LENGTH;

            if (particle.position.y - radius < 0) {
                particle.position.y = radius;
                particle.velocity.y = -particle.velocity.y;
            } else if (particle.position.y + radius > this.canvas.height) {
                particle.position.y = this.canvas.height - radius;
                particle.velocity.y = -particle.velocity.y;
            }

            if (particle.position.x - radius < 0) {
                particle.position.x = radius;
                particle.velocity.x = -particle.velocity.x;
            } else if (particle.position.x + radius > this.canvas.width) {
                particle.position.x = this.canvas.width - radius;
                particle.velocity.x = -particle.velocity.x;
            }
        });
    }

    normalizeVelocityVectors() {
        let totalKineticEnergy = this.computeKineticEnergy();
        let totalEnergy = this.computeTotalEnergy();

        let factor = Math.sqrt((this.totalEnergy - totalEnergy) / totalKineticEnergy + 1);

        this.particles.forEach(particle => {
            particle.velocity.x *= factor;
            particle.velocity.y *= factor;
        });
    }

    computeTotalEnergy() {
        let total = 0;
        this.particles.forEach((particle, index) => {
            total += particle.getKineticEnergy();
            for (let i = index + 1; i < this.particles.length; i++) {
                total += particle.getPotentialEnergy(this.particles[i])
            }
        });
        return total;
    }

    computeKineticEnergy() {
        return this.particles.reduce((energy, particle) => energy + particle.getKineticEnergy(), 0);
    }

    render() {
        this.context.fillStyle = 'white';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);


        this.particles.forEach(particle => particle.render(this.context));

        this.mouseCursor.render(this.context)
        this.context.fillStyle = '#fff';
        this.context.fillText('Total Energy: ' + this.computeTotalEnergy(), 0, 30);
    }
}

function getRandomColor() {
    const letters = "0123456789abcdef";
    let color = "#";

    for (let i = 0; i < 6; ++i) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function createRandomParticle(canvas) {
    let charge = 10;
    let radius = charge / Configuration.PIXELS_PER_UNIT_LENGTH;
    let particle = new Particle(charge, radius, 'red');
    particle.position.x = canvas.width * Math.random();
    particle.position.y = canvas.height * Math.random();
    particle.velocity.x = Configuration.MAXIMUM_INITIAL_VELOCITY * Math.random();
    particle.velocity.y = Configuration.MAXIMUM_INITIAL_VELOCITY * Math.random();
    
    return particle;
}

function createPlayerParticle() {
    let player = new Particle(10, 2, 'blue');
    player.position.x = 20;
    player.position.y = 20;
    player.velocity.x = Configuration.MAXIMUM_INITIAL_VELOCITY * Math.random();
    player.velocity.y = Configuration.MAXIMUM_INITIAL_VELOCITY * Math.random();
    return player;
}

function createRandomParticles(total, canvas) {
    let particles = [];
    for (let i = 0; i < total; i++) {
        particles.push(createRandomParticle(canvas));
    }
    return particles;
}

const pluck = (arr, key) => arr.map(item => item[key]);


function main() {
    let canvas = document.querySelector('canvas');
    canvas.width = innerWidth
    canvas.height = innerHeight

    let particles = createRandomParticles(Configuration.DEFAULT_NUMBER_OF_PARTICLES, canvas);

    // let mouseCursor = createPlayerParticle();
    let mouseCursor = particles[0];


    // console.log(particles[0])
    // console.log(mouseCursor)

    const actions = {
        setMousePosition(x, y) {Object.assign(mouseCursor), {x, y}}
    }

    window.addEventListener('mousemove', e => {
        actions.setMousePosition(
            mouseCursor.position.x = e.pageX,
            mouseCursor.position.y = e.pageY,
        )
    });

    

    let engine = new SimulationEngine(
        canvas,
        particles,
        Configuration.TIME_STEP,
        Configuration.SLEEP_TIME,
        mouseCursor
    );


    engine.start();
    let started = true;

    window.addEventListener('keydown', e => {
        if (e.key == ' ') {
            if (started) {
                engine.stop();
                started = false;
            } else {
                engine.start();
                started = true;
            }
        }
    });
}

main();








// function cursor(e) {
//     let mouseCursor = document.querySelector('.cursor');

//     mouseCursor.style.top = e.pageY + 'px';
//     mouseCursor.style.left = e.pageX + 'px';
//     mouseCursor = new Particle(20, 20, 'green');
//     mouseCursor.position.x = e.pageX;
//     mouseCursor.position.y = e.pageY;
//     mouseCursor.velocity.x = Configuration.MAXIMUM_INITIAL_VELOCITY * Math.random();
//     mouseCursor.velocity.y = Configuration.MAXIMUM_INITIAL_VELOCITY * Math.random();

// }