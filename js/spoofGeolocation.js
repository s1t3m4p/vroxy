export default (options) => {
  const handler = {
    apply: (target, thisArg, argumentsList) => {
      const funcCopy = argumentsList[0]

      argumentsList[0] = (position) => {
        const spoofCoordinatesFor = (obj) => {
          Object.defineProperty(obj, 'latitude', {
            value: options.latitude ? +options.latitude : null,
          })
          Object.defineProperty(obj, 'longitude', {
            value: options.longitude ? +options.longitude : null,
          })
          Object.defineProperty(obj, 'speed', {
            value: null,
          })
          Object.defineProperty(obj, 'heading', {
            value: null,
          })
          Object.defineProperty(obj, 'accuracy', {
            value: 20000,
          })
          Object.defineProperty(obj, 'altitude', {
            value: null,
          })
          Object.defineProperty(obj, 'altitudeAccuracy', {
            value: null,
          })
        }

        if ('timestamp' in position) {
          Object.defineProperty(position, 'timestamp', {
            value: Date.now(),
          })
        }

        if ('coords' in position) {
          spoofCoordinatesFor(position.coords)
          spoofCoordinatesFor(GeolocationCoordinates.prototype)
        }

        funcCopy(position)
      }
      return target.apply(thisArg, argumentsList)
    },
  }

  if (window.navigator?.geolocation) {
    Object.getPrototypeOf(navigator.geolocation).getCurrentPosition = new Proxy(
      Object.getPrototypeOf(navigator.geolocation).getCurrentPosition,
      handler
    )
    Object.getPrototypeOf(navigator.geolocation).watchPosition = new Proxy(
      Object.getPrototypeOf(navigator.geolocation).watchPosition,
      handler
    )
  }
}
