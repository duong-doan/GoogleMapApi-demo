import React, { useCallback, useEffect, useRef, useState } from "react";

import ReactMapGL, {
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  FlyToInterpolator,
  GeolocateControl,
  FullscreenControl,
  Source,
  Layer,
} from "react-map-gl";

import useSwr from "swr";
import useSupercluster from "use-supercluster";
import ArcLayer from "../ArcLayer/index";
import * as d3 from "d3-ease";

const REACT_APP_MAPBOX_TOKEN =
  "pk.eyJ1IjoiZHVvbmdkb2FuIiwiYSI6ImNrcW0wZ2R3cDByZnkycW5zYWpnaXd4dmIifQ.o8veIVT3DXhjcK2C0OtX8w";

const API_URL_CLUSTER =
  "https://data.police.uk/api/crimes-street/all-crime?lat=52.629729&lng=-1.131592&date=2019-10";

const MapBox = () => {
  const fullscreenControlStyle = {
    bottom: 10,
    right: 10,
  };

  const geolocateControlStyle = {
    left: 10,
    top: 10,
  };

  const scaleControlStyle = {
    left: 20,
    bottom: 100,
  };

  const navControlStyle = {
    right: 10,
    top: 10,
  };

  const skyLayer = {
    id: "sky",
    type: "sky",
    paint: {
      "sky-type": "atmosphere",
      "sky-atmosphere-sun": [0.0, 0.0],
      "sky-atmosphere-sun-intensity": 15,
    },
  };

  const [originMap, setOriginMap] = useState(null);

  const [viewport, setViewport] = useState({
    latitude: 52.63,
    longitude: -1,
    zoom: 10,
    width: "100vw",
    height: "100vh",
  });

  const [selectItem, setSelectItem] = useState(null);

  const [view3D, setView3D] = useState(false);

  const [value, setValue] = useState({
    cityFrom: "",
    cityTo: "",
    lngFrom: "",
    latFrom: "",
    lngTo: "",
    latTo: "",
  });

  const [idLayer, setIdLayer] = useState("arc");
  const [dataLayer, setDataLayer] = useState([
    {
      inbound: 500,
      outbound: 500,
      from: {
        name: "Viet Nam",
        coordinates: [108, 16],
      },
      to: {
        name: "Australian",
        coordinates: [130, -20],
      },
    },
  ]);

  const mapRef = useRef();

  const fetcher = (...args) =>
    fetch(...args).then((response) => response.json());

  const { data, error } = useSwr(API_URL_CLUSTER, { fetcher });

  const crimes = data && !error ? data.slice(0, 200) : [];

  // get points
  const points = crimes.map((crime) => ({
    type: "Feature",
    properties: {
      cluster: false,
      crimeId: crime.id,
      category: crime.category,
    },
    geometry: {
      type: "Point",
      coordinates: [
        parseFloat(crime.location.longitude),
        parseFloat(crime.location.latitude),
      ],
    },
  }));

  // get bounds
  const bounds = mapRef.current
    ? mapRef.current.getMap().getBounds().toArray().flat()
    : null;

  // get cluster
  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: viewport.zoom,
    options: { radius: 75, maxZoom: 20 },
  });

  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Escape") {
        setSelectItem(null);
      }
    };
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  });

  const onMapLoad = useCallback((map) => {
    setOriginMap(map.target);
  });

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const dataLayerItem = {
      inbound: 72633,
      outbound: 74735,
      from: {
        name: value.cityFrom,
        coordinates: [parseFloat(value.lngFrom), parseFloat(value.latFrom)],
      },
      to: {
        name: value.cityTo,
        coordinates: [parseFloat(value.lngTo), parseFloat(value.latTo)],
      },
    };

    setValue({
      cityFrom: "",
      cityTo: "",
      lngFrom: "",
      latFrom: "",
      lngTo: "",
      latTo: "",
    });

    setDataLayer((prev) => {
      prev.push(dataLayerItem);
      return prev;
    });

    setIdLayer(`arc-layer-${dataLayer.length}`);
  };

  const handleClickClusterMarker = (cluster, lat, lng) => {
    const expansionZoom = Math.min(
      supercluster.getClusterExpansionZoom(cluster.id),
      20,
    );

    setViewport({
      ...viewport,
      latitude: lat,
      longitude: lng,
      zoom: expansionZoom,
    });
  };

  const handleClickBtn3D = () => {
    setView3D((prevState) => {
      if (!prevState) {
        originMap.setTerrain({
          source: "mapbox-dem",
          exaggeration: 1.5,
        });
      } else {
        originMap.setTerrain({
          source: "mapbox",
        });
      }
      return !prevState;
    });
  };

  // const handleCreateDronesPath = (e) => {
  //   console.log(`coordinates: \n lng : ${e.lngLat[0]} \n lat : ${e.lngLat[1]}`);
  // };

  return (
    <>
      <form
        onSubmit={handleSubmitForm}
        style={{ display: "flex", alignItems: "center" }}
      >
        <div className="wrap">
          <h3>City</h3>
          <div className="form-group">
            <label htmlFor="">City from: </label>
            <input
              type="text"
              value={value.cityFrom}
              onChange={(e) => setValue({ ...value, cityFrom: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="">City to: </label>
            <input
              type="text"
              value={value.cityTo}
              onChange={(e) => setValue({ ...value, cityTo: e.target.value })}
            />
          </div>
        </div>

        <div className="wrap">
          <h3>Coordinate from</h3>
          <div className="form-group">
            <label htmlFor="">Longitude: </label>
            <input
              type="text"
              value={value.lngFrom}
              onChange={(e) => setValue({ ...value, lngFrom: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="">Latitude: </label>
            <input
              type="text"
              value={value.latFrom}
              onChange={(e) => setValue({ ...value, latFrom: e.target.value })}
            />
          </div>
        </div>

        <div className="wrap">
          <h3>Coordinate to</h3>
          <div className="form-group">
            <label htmlFor="">Longitude: </label>
            <input
              type="text"
              value={value.lngTo}
              onChange={(e) => setValue({ ...value, lngTo: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="">Latitude: </label>
            <input
              type="text"
              value={value.latTo}
              onChange={(e) => setValue({ ...value, latTo: e.target.value })}
            />
          </div>
        </div>

        <button type="submit">Add</button>
      </form>
      <ReactMapGL
        {...viewport}
        ref={mapRef}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        mapboxApiAccessToken={REACT_APP_MAPBOX_TOKEN}
        onViewportChange={(viewChange) => {
          setViewport(viewChange);
        }}
        onLoad={onMapLoad}
        transitionDuration={300}
        transitionInterpolator={
          new FlyToInterpolator({
            speed: 2,
          })
        }
        transitionEasing={d3.easePolyOut}
        // onClick={handleCreateDronesPath}
      >
        {/* layer drones path demo */}
        {dataLayer.length !== 0 && (
          <ArcLayer viewState={viewport} data={dataLayer} id={idLayer} />
        )}

        {/* maker location */}
        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates;

          if (cluster.properties.cluster) {
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                latitude={lat}
                longitude={lng}
              >
                <div
                  className="cluster-marker"
                  style={{
                    width: `${
                      10 + (cluster.properties.point_count / points.length) * 20
                    }px`,
                    height: `${
                      10 + (cluster.properties.point_count / points.length) * 20
                    }px`,
                  }}
                  onClick={() => handleClickClusterMarker(cluster, lat, lng)}
                >
                  {cluster.properties.point_count}
                </div>
              </Marker>
            );
          }

          return (
            <Marker key={cluster.id} latitude={lat} longitude={lng}>
              <button
                className="maker"
                onClick={() => {
                  setSelectItem(cluster);
                }}
              >
                <i className="fas fa-street-view"></i>
              </button>
            </Marker>
          );
        })}

        {/* popup information */}
        {selectItem && (
          <Popup
            latitude={selectItem.geometry.coordinates[1]}
            longitude={selectItem.geometry.coordinates[0]}
            onClose={() => {
              setSelectItem(null);
            }}
          >
            <div>
              <h1>Hello</h1>
            </div>
          </Popup>
        )}

        {/* 3D */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        {!view3D ? <Layer {...skyLayer} /> : null}

        <button className="btn-3D" onClick={handleClickBtn3D}>
          3D
        </button>

        {/* navigation scale zoom in/out */}
        <NavigationControl style={navControlStyle} />

        {/* show kilometer */}
        <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />

        {/* <AttributionControl compact={true} style={attributionStyle} /> */}

        {/* find location of user */}
        <GeolocateControl
          style={geolocateControlStyle}
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
          auto
        />

        <FullscreenControl style={fullscreenControlStyle} />
      </ReactMapGL>
    </>
  );
};

export default MapBox;
