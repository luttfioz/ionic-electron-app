import { } from 'googlemaps';
import { Injectable } from '@angular/core';
import { Address } from './address';

@Injectable({
  providedIn: 'root'
})
export class MapsService {
  private geocoder = new google.maps.Geocoder();

  constructor() { }

  public geocode(placeIdOrLocation: string | google.maps.LatLngLiteral): Promise<Address> {
      return new Promise<Address>((resolve, reject) => {
        const params: google.maps.GeocoderRequest = typeof placeIdOrLocation === 'string'
          ? { placeId: placeIdOrLocation }
          : { location: placeIdOrLocation };
        this.geocoder.geocode(params, (results, status) => {
          if (status !== google.maps.GeocoderStatus.OK) {
            return reject(status);
          }
          // The first result is the most specific.
          const result = results[0];
          console.debug('Geocoding returned', result);
          const address = this.parseResult(result);
          resolve(address);
        });
      });
    }
    
    private parseResult(result: google.maps.GeocoderResult): Address {
        const components = result.address_components;
        const parsed = new Map<string, string>();
        for (const component of components) {
          for (const type of component.types) {
            parsed.set(type, component.short_name);
          }
        }
        const address = {
          addressLine1: parsed.get('street_address')
            || `${parsed.get('street_number')} ${parsed.get('route')}`,
          city: parsed.get('locality'),
          state: parsed.get('administrative_area_level_1'),
          zipCode: parsed.get('postal_code'),
          placeId: result.place_id,
          latitude: result.geometry.location.lat().toString(),
          longitude: result.geometry.location.lng().toString()
        };
        return address;
      }      
}
