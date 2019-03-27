using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MovingSwing : MonoBehaviour
{
    public float speed;
    public void Start()
    {
        
    }
    //moving the object with the defined speed
    private void Update()
    {
        float z = gameObject.transform.rotation.z;
        if (z > 0.01) {
            transform.Rotate(0,0,-1*speed, Space.World );
        }
        else if (z < -0.01)
        {
            transform.Rotate(0, 0, speed, Space.World);
        }else{
            Destroy(gameObject);
        }
    }
}
