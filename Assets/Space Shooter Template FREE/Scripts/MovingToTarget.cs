using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// This script moves the attached object along the Y-axis with the defined speed
/// </summary>
public class MovingToTarget : MonoBehaviour
{

    [Tooltip("Moving speed to assigned target")]
    public float speed;
    Vector3 targetPoint;
    GameObject target;
    Transform targetTransform;
    public void Start()
    {
        target = GameObject.Find("Player");
        if (target != null) { 
            targetTransform = target.GetComponent<Transform>();
            float x = transform.position.x - targetTransform.position.x;
            float y = transform.position.y - targetTransform.position.y;
            targetPoint = new Vector3(x, y);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    //moving the object with the defined speed
    private void Update()
    {
        if(targetPoint != null)
            transform.Translate(targetPoint * speed * Time.deltaTime);
    }
}
