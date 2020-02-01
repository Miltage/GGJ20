import * as THREE from 'three';
import * as CANNON from 'cannon';

import { OrbitControls } from './libs/OrbitControls.js';
import CannonDebugRenderer from './utils/CannonDebugRenderer.js';

import RoadSegment from './RoadSegment';
import Car from './Car';
import Coin from './Coin';
import Player from './Player.js';
import Truck from './Truck.js';
import Bus from './Bus.js';
import Sedan from './Sedan.js';

const UP = new THREE.Vector3(0, 1, 0);
const EPSILON = 0.00001;
const PHYSICS_TIMESTEP = 1.0 / 60.0;
const PHYSICS_SUBSTEPS = 4;
const ROAD_SEGMENTS = 25;
const COIN_INTERVAL = 20;
const TRAFFIC_INTERVAL = 40;

let keys = { LEFT: 65, UP: 87, RIGHT: 68, DOWN: 83 };
let input = {};

var scene, world, debug, camera, cube, road, controls, player;

let distanceCounter = 0;
let cars = [];
let roads = [];
let coins = [];
let traffic = [];

export default class Game {

  constructor(renderer) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f3f3);
	
    var width = window.innerWidth / 24;
    var height = window.innerHeight / 24;
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
    //camera = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, -20, 500);
    camera.position.set(0, 20, -60); 
    camera.lookAt(0, 0, 0);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.minZoom = 0.5;
    controls.maxZoom = 1;
    controls.target = new THREE.Vector3(0, 0, 40);

    let light = new THREE.DirectionalLight(0xffffff, 0.8);
    var ambient = new THREE.AmbientLight(0x666666); // soft white light
    scene.add(light);
    scene.add(ambient);

    this.initPhysics();

    // generate roads
    for (var i = 0; i < ROAD_SEGMENTS; i++)
    {
      var road = new RoadSegment();
      road.position.z = i * RoadSegment.LENGTH;
      scene.add(road);
      roads.push(road);
    }

    // add player
    player = new Player(0, 2, 0);
    scene.add(player);
    cars.push(player);
    world.add(player.body);
  }

  initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -10, 0); // m/s²
    debug = new CannonDebugRenderer(scene, world);

    var groundMaterial = new CANNON.Material("groundMaterial");
    var frictionless_cm = new CANNON.ContactMaterial(groundMaterial, Car.physicsMaterial, {
        friction: 0,
        restitution: 0
    });
    // Create a plane
    var groundBody = new CANNON.Body({
      mass: 0, // mass == 0 makes the body static
      material: groundMaterial
    });
    var plane = new CANNON.Plane();
    groundBody.addShape(plane);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
    world.addBody(groundBody);
    world.addContactMaterial(frictionless_cm);

  }

  update(delta) {
    camera.position.set(0, 30, player.position.z - 30);
    controls.target = player.position;
    controls.update();

    world.step(PHYSICS_TIMESTEP, PHYSICS_SUBSTEPS);
    
    if (Math.floor(player.position.z) > distanceCounter)
    {
      distanceCounter = Math.floor(player.position.z);

      if (distanceCounter % COIN_INTERVAL == 0 && Math.random() > 0.2)
        this.addCoin();
      if (distanceCounter % TRAFFIC_INTERVAL == 0 && Math.random() > 0.4)
        this.addTraffic();
    }

    coins.forEach(coin => {
      coin.update(delta);

      if (coin.position.distanceTo(player.position) < 5)
        coin.collect();
      else if (coin.position.distanceTo(player.position) > 200)
        coin.finished = true;
    });

    for (var i = 0; i < coins.length; i++)
    {
      if (coins[i].finished)
      {
        scene.remove(coins[i]);
        coins.splice(i, 1);
      }
    }

    cars.forEach(car => {
      car.update(delta);
    });

    traffic.forEach(car => {
      car.drive();

      if (car.position.distanceTo(player.position) > 500)
        car.remove = true;
    });

    for (var i = 0; i < cars.length; i++)
    {
      if (cars[i].remove)
        cars.splice(i, 1);
    }

    roads.forEach(road => {
      var dz = player.position.z - road.position.z;
      if (Math.abs(dz) > ROAD_SEGMENTS * RoadSegment.LENGTH/2)
        road.position.z += RoadSegment.LENGTH * ROAD_SEGMENTS * (dz > 0 ? 1 : -1);
    });

    if (input[keys.UP])
      player.drive();
    if (input[keys.LEFT])
      player.turn(-1);
    if (input[keys.RIGHT])
      player.turn(1);
    if (input[keys.DOWN])
      player.brake();
  }

  addCoin() {
    var coin = new Coin();
    coin.position.z = player.position.z + 100;
    coins.push(coin);
    scene.add(coin);
  }

  addTraffic() {
    let lane = Math.floor(Math.random() * 4);
    var car = new Truck(-12 + lane*8, 2, player.position.z + 100);
    scene.add(car);
    cars.push(car);
    traffic.push(car);
    world.add(car.body);

    if (lane > 1)
      car.rotateY(Math.PI);
  }

  render(renderer) {
    debug.update(); 
    renderer.render(scene, camera);
  }

  onMouseMove(event) {
    
  }

  onKeyDown(event) {
    input[event.keyCode] = true;
  }

  onKeyUp(event) {
    input[event.keyCode] = false;
  }

  onMouseDown(event) {
    // event.button
  }

}